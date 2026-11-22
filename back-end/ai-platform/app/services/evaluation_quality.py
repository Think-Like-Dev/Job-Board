"""Keeps a model's narrative only when a recruiter can read it.

The local model answers a rejected JSON with the validation error, or echoes
the field names it was shown. A non-empty string is not an assessment, so the
pipeline sanitises the evaluation before storing it: a run with no usable prose
becomes `SCORE_ONLY` instead of showing "Assessed" over an error message.
"""

from __future__ import annotations

import re

from app.schemas.job_match import QualitativeEvaluationSchema

_CONTROL = {
    "",
    "0",
    "1",
    "-",
    "...",
    "false",
    "na",
    "n/a",
    "none",
    "null",
    "true",
}

# Names the model sees in the prompt or the schema. A line made only of these
# is an echo, not an assessment.
_ECHO_KEYS = {
    "certifications",
    "component_scores",
    "education",
    "experience",
    "fit_analysis",
    "interview_questions",
    "projects",
    "risks",
    "role",
    "semantic",
    "skills",
    "strengths",
}

_ERROR_PREFIXES = (
    "error",
    "json",
    "missing '",
    "schema",
    "the resume is missing",
    "validation",
)
_ERROR_MARKERS = (
    "field(s) do not match",
    "resume text was unreadable",
)

_WORDS = re.compile(r"\w+", re.UNICODE)
_BULLET = re.compile(r"^(?:[-*•]|\d+[.)])\s+")


def sanitise_evaluation(
    evaluation: QualitativeEvaluationSchema,
) -> QualitativeEvaluationSchema:
    """Drops junk prose and junk bullets, keeping only readable text."""
    return QualitativeEvaluationSchema(
        fit_analysis=_clean_narrative(evaluation.fit_analysis),
        strengths=_clean_items(evaluation.strengths),
        risks=_clean_items(evaluation.risks),
        interview_questions=_clean_items(evaluation.interview_questions),
    )


def _clean_narrative(value: str) -> str:
    text = "\n".join(line.strip() for line in value.splitlines() if line.strip()).strip()
    if not text or _is_junk(text):
        return ""

    words = _WORDS.findall(text.casefold())
    if len(words) < 8:
        return ""
    return text


def _clean_items(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = _BULLET.sub("", value).strip()
        if not (5 <= len(text) <= 200) or _is_junk(text):
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(text)
    return cleaned


def _is_junk(text: str) -> bool:
    lowered = " ".join(text.casefold().split()).strip(" .")
    if lowered in _CONTROL or lowered in _ECHO_KEYS:
        return True

    words = set(_WORDS.findall(lowered))
    if words and words <= _ECHO_KEYS:
        return True

    if lowered.startswith(_ERROR_PREFIXES):
        return True
    return any(marker in lowered for marker in _ERROR_MARKERS)
