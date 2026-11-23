"""Builds a job spec without a language model.

The recruiter already types the skills a job needs and the experience it asks
for. That is enough to score a candidate deterministically, so the pipeline
still produces a score when no model is configured (and when a model outage
happens). The language model path refines the same spec when it is available.
"""

from __future__ import annotations

import re

from app.schemas.job_match import JobSpec, SeniorityLevel

# Seniority tokens and their level, mirroring the scoring engine.
_LEVEL_TOKENS: dict[str, int] = {
    "intern": 0,
    "junior": 1,
    "mid": 2,
    "middle": 2,
    "senior": 3,
    "lead": 4,
    "staff": 4,
    "principal": 5,
}

_LEVEL_TO_SENIORITY: dict[int, SeniorityLevel] = {
    0: SeniorityLevel.JUNIOR,
    1: SeniorityLevel.JUNIOR,
    2: SeniorityLevel.MID,
    3: SeniorityLevel.SENIOR,
    4: SeniorityLevel.LEAD,
    5: SeniorityLevel.LEAD,
}

_YEARS_PATTERN = re.compile(r"(\d+(?:\.\d+)?)")


def infer_seniority(title: str) -> SeniorityLevel:
    """Reads the seniority out of a job title."""
    tokens = set(re.findall(r"[a-z0-9+#.]+", (title or "").lower()))
    for token, level in _LEVEL_TOKENS.items():
        if token in tokens:
            return _LEVEL_TO_SENIORITY[level]
    return SeniorityLevel.UNKNOWN


def parse_min_years(value: str | None) -> float:
    """Reads the minimum years of experience out of free text.

    Handles "3", "3-5", "5+", "3 to 5 years", "2+ yrs".
    """
    if not value:
        return 0.0
    match = _YEARS_PATTERN.search(value)
    if not match:
        return 0.0
    try:
        return float(match.group(1))
    except ValueError:
        return 0.0


def build_deterministic_job_spec(
    *,
    title: str,
    description_text: str,
    skills: list[str],
    years_of_experience: str | None,
) -> JobSpec:
    """A job spec built from what the recruiter typed, without a model."""
    cleaned = [skill.strip() for skill in skills if skill and skill.strip()]

    return JobSpec(
        title=title or "",
        seniority=infer_seniority(title),
        min_years_experience=parse_min_years(years_of_experience),
        must_have_skills=cleaned,
        nice_to_have_skills=[],
        summary=(description_text or "")[:1_000],
    )
