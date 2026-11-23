"""Deterministic clean-up of what the local model extracted.

A 0.5 B model copies section headings into `skills`, writes whole sentences as
skills, and sometimes invents an employer. The prompt asks it not to; this
module makes the promise true without asking the model again.

Everything here is deterministic and grounded in the resume text: a skill or an
employer that does not appear in the source is dropped, not scored.
"""

from __future__ import annotations

import re

from app.schemas.resume import EducationEntry, ExperienceEntry, ResumeExtractionSchema
from app.services.scoring.skills import contains_skill

# Section headings, compacted to letters only, so "Programming Languages" and
# "ProgrammingLanguages" are the same entry.
_HEADINGS = {
    "skills",
    "technicalskills",
    "programminglanguages",
    "languages",
    "corelanguages",
    "frameworks",
    "libraries",
    "databases",
    "tools",
    "softskills",
    "projects",
    "experience",
    "workexperience",
    "education",
    "certifications",
    "summary",
    "profile",
    "aiframeworks",
    "aiagenticframeworks",
}

# Words that make an entry a job title, a sentence or a soft skill, not a
# technology the scorer can match.
_ROLE_WORDS = {"developer", "engineer", "manager", "analyst", "intern", "consultant"}
_NON_SKILL_PREFIXES = {
    "a",
    "an",
    "and",
    "built",
    "created",
    "designed",
    "developed",
    "for",
    "implemented",
    "integrated",
    "introduction",
    "led",
    "managed",
    "the",
    "using",
    "with",
    "worked",
}
_SOFT_SKILLS = {
    "adaptability",
    "analytical",
    "communication",
    "creativity",
    "critical thinking",
    "flexible",
    "hardworking",
    "interpersonal",
    "leadership",
    "organizational",
    "problem solving",
    "punctual",
    "self-motivated",
    "teamwork",
    "time management",
}

_MAX_SKILL_WORDS = 3
_MAX_SKILL_CHARS = 60
_HEADING_KEY = re.compile(r"[^a-z]")
_PHRASE = re.compile(r"[a-z0-9+#.]+")


def clean_extraction(
    extracted: ResumeExtractionSchema,
    raw_text: str,
) -> ResumeExtractionSchema:
    """Cleans the lists and grounds them in the resume text."""
    source = raw_text or ""
    return extracted.model_copy(
        update={
            "skills": _clean_skills(extracted.skills, source),
            "experience": [
                entry for entry in extracted.experience if _keep_experience(entry, source)
            ],
            "education": [entry for entry in extracted.education if _keep_education(entry, source)],
            "certifications": [
                cert for cert in extracted.certifications if _grounded(cert, source)
            ],
        }
    )


def _clean_skills(values: list[str], source: str) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()

    for value in values:
        for piece in re.split(r"[,;|]", value):
            text = _skill_text(piece)
            if not text:
                continue
            key = " ".join(text.casefold().split())
            if key in seen:
                continue
            if not _grounded(text, source):
                continue
            seen.add(key)
            cleaned.append(text)

    return cleaned


def _skill_text(value: str) -> str:
    text = re.sub(r"\(.*?\)", " ", value).strip()
    if ":" in text:
        # "Core Languages: Python" -> "Python"
        text = text.split(":", 1)[1].strip()
    text = text.strip(" -•\t")
    if not text or len(text) > _MAX_SKILL_CHARS:
        return ""
    words = text.split()
    if len(words) > _MAX_SKILL_WORDS:
        return ""
    if words[0].casefold() in _NON_SKILL_PREFIXES:
        return ""
    if any(word.casefold() in _ROLE_WORDS for word in words):
        return ""
    if text.casefold() in _SOFT_SKILLS:
        return ""
    if _HEADING_KEY.sub("", text.casefold()) in _HEADINGS:
        return ""
    return text


def _keep_experience(entry: ExperienceEntry, source: str) -> bool:
    if not source.strip():
        return True
    # The model invented an employer when the name is absent from the source.
    return not entry.company or _phrase_grounded(entry.company, source)


def _keep_education(entry: EducationEntry, source: str) -> bool:
    if not source.strip():
        return True
    return not entry.institution or _phrase_grounded(entry.institution, source)


def _phrase_grounded(value: str, source: str) -> bool:
    """Whether the whole name appears as a phrase in the resume text.

    Skills are matched word by word; an employer or an institution is a name,
    so every word appearing somewhere in the resume is not enough.
    """
    phrase = " ".join(_PHRASE.findall(value.casefold()))
    haystack = " ".join(_PHRASE.findall(source.casefold()))
    return bool(phrase) and phrase in haystack


def _grounded(value: str, source: str) -> bool:
    """Whether every word of `value` appears in the resume text."""
    if not source.strip():
        return True
    return contains_skill(source, value)
