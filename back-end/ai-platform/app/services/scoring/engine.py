from __future__ import annotations

import re
from datetime import date

from app.schemas.job_match import JobSpec, SeniorityLevel
from app.schemas.resume import EducationEntry, ExperienceEntry, ResumeExtractionSchema
from app.schemas.scoring import ComponentScores
from app.services.scoring.experience import parse_month, score_experience
from app.services.scoring.models import DeterministicScore
from app.services.scoring.semantic import score_semantic
from app.services.scoring.skills import contains_skill, score_skills

WEIGHTS: dict[str, float] = {
    "skills": 0.35,
    "experience": 0.20,
    "semantic": 0.20,
    "role": 0.10,
    "projects": 0.05,
    "certifications": 0.05,
    "education": 0.05,
}

_STOPWORDS = {
    "a",
    "an",
    "and",
    "at",
    "developer",
    "engineer",
    "for",
    "in",
    "of",
    "the",
}
_LEVELS = {
    "intern": 0,
    "junior": 1,
    "mid": 2,
    "middle": 2,
    "senior": 3,
    "lead": 4,
    "staff": 4,
    "principal": 5,
}
_DEGREE_RANKS = (
    ("phd", 5),
    ("doctor", 5),
    ("master", 4),
    ("mba", 4),
    ("bachelor", 3),
    ("b.tech", 3),
    ("b.sc", 3),
    ("associate", 2),
    ("diploma", 2),
    ("high school", 1),
)


def _tokens(value: str) -> set[str]:
    return {
        token for token in re.findall(r"[a-z0-9+#.]+", value.lower()) if token not in _STOPWORDS
    }


def _infer_level(title: str) -> int | None:
    tokens = _tokens(title)
    for token, level in _LEVELS.items():
        if token in tokens:
            return level
    return None


def score_role(entries: list[ExperienceEntry], spec: JobSpec) -> float:
    latest = max(
        (entry for entry in entries if entry.role),
        key=lambda entry: parse_month(entry.end_date) or date.max,
        default=None,
    )
    candidate_title = latest.role if latest else ""
    job_tokens = _tokens(spec.title)
    title_score = (
        len(job_tokens & _tokens(candidate_title)) / len(job_tokens) * 100.0 if job_tokens else 0.0
    )

    candidate_level = _infer_level(candidate_title)
    job_level = (
        _LEVELS.get(spec.seniority.value) if spec.seniority != SeniorityLevel.UNKNOWN else None
    )
    if candidate_level is None or job_level is None:
        level_score = 70.0
    else:
        difference = abs(candidate_level - job_level)
        level_score = 100.0 if difference == 0 else 60.0 if difference == 1 else 25.0

    return 0.5 * title_score + 0.5 * level_score


def score_projects(entries: list[ExperienceEntry], spec: JobSpec) -> float:
    if not spec.must_have_skills:
        return 0.0
    text = " ".join(" ".join([entry.role, entry.company, *entry.achievements]) for entry in entries)
    hits = sum(1 for skill in spec.must_have_skills if contains_skill(text, skill))
    return hits / len(spec.must_have_skills) * 100.0


def score_certifications(certifications: list[str], spec: JobSpec) -> float:
    if not spec.required_certifications:
        return 0.0
    text = " | ".join(certifications)
    hits = sum(1 for cert in spec.required_certifications if contains_skill(text, cert))
    return hits / len(spec.required_certifications) * 100.0


def _degree_rank(value: str | None) -> int | None:
    if not value:
        return None
    lowered = value.lower()
    for keyword, rank in _DEGREE_RANKS:
        if keyword in lowered:
            return rank
    return None


def score_education(education: list[EducationEntry], spec: JobSpec) -> float:
    required = _degree_rank(spec.required_education)
    if required is None:
        return 0.0
    candidate = max((_degree_rank(entry.degree) or 0 for entry in education), default=0)
    if candidate == 0:
        return 0.0
    return 100.0 if candidate >= required else candidate / required * 100.0


def evaluate_knockout(_: ResumeExtractionSchema, __: JobSpec) -> str | None:
    # shortcut: the profile has no work-authorization/location-willingness fields yet,
    # so K stays 1. Revisit when the core profile carries them.
    return None


def _applicable_components(spec: JobSpec, has_vectors: bool) -> dict[str, bool]:
    """Components the JD actually asks about; the rest are excluded from scoring."""
    return {
        "skills": bool(spec.must_have_skills or spec.nice_to_have_skills),
        "experience": spec.min_years_experience > 0,
        "semantic": has_vectors,
        "role": bool(spec.title.strip()),
        "projects": bool(spec.must_have_skills),
        "certifications": bool(spec.required_certifications),
        "education": bool(spec.required_education),
    }


def score_candidate(
    resume: ResumeExtractionSchema,
    spec: JobSpec,
    resume_vector: list[float] | None = None,
    job_vector: list[float] | None = None,
    today: date | None = None,
) -> DeterministicScore:
    skills, matching_skills, missing_skills = score_skills(
        resume.skills, spec.must_have_skills, spec.nice_to_have_skills
    )
    applicable = _applicable_components(spec, bool(resume_vector and job_vector))
    components = ComponentScores(
        skills=round(skills, 2),
        experience=round(
            score_experience(resume.experience, spec, today) if applicable["experience"] else 0.0,
            2,
        ),
        semantic=round(
            score_semantic(resume_vector or [], job_vector or [])
            if applicable["semantic"]
            else 0.0,
            2,
        ),
        role=round(score_role(resume.experience, spec) if applicable["role"] else 0.0, 2),
        projects=round(
            score_projects(resume.experience, spec) if applicable["projects"] else 0.0,
            2,
        ),
        certifications=round(
            score_certifications(resume.certifications, spec)
            if applicable["certifications"]
            else 0.0,
            2,
        ),
        education=round(
            score_education(resume.education, spec) if applicable["education"] else 0.0,
            2,
        ),
    )

    active_weight = sum(weight for component, weight in WEIGHTS.items() if applicable[component])
    weighted = (
        sum(
            weight * getattr(components, component)
            for component, weight in WEIGHTS.items()
            if applicable[component]
        )
        / active_weight
        if active_weight
        else 0.0
    )
    knockout_reason = evaluate_knockout(resume, spec)
    final_score = 0.0 if knockout_reason else weighted
    return DeterministicScore(
        score=round(min(100.0, max(0.0, final_score)), 2),
        components=components,
        matching_skills=matching_skills,
        missing_skills=missing_skills,
        knockout_reason=knockout_reason,
    )
