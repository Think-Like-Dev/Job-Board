"""Structured JD requirements and the qualitative LLM evaluation."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class SeniorityLevel(StrEnum):
    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    UNKNOWN = "unknown"


class KnockoutRequirements(BaseModel):
    requires_work_authorization: bool = False
    onsite_only: bool = False
    max_notice_days: int | None = None


class JobSpec(BaseModel):
    title: str = ""
    seniority: SeniorityLevel = SeniorityLevel.UNKNOWN
    min_years_experience: float = 0.0
    must_have_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    required_certifications: list[str] = Field(default_factory=list)
    required_education: str | None = None
    knockouts: KnockoutRequirements = Field(default_factory=KnockoutRequirements)
    summary: str = ""


class QualitativeEvaluationSchema(BaseModel):
    """The LLM's narrative about the fit.

    Every field is optional on purpose: when no model is configured the
    deterministic score is still produced and stored, and the result is
    reported as "score only" instead of "scored".
    """

    fit_analysis: str = ""
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    interview_questions: list[str] = Field(default_factory=list)

    @field_validator("fit_analysis", mode="after")
    @classmethod
    def _tidy_summary(cls, value: str) -> str:
        return value.strip()

    @field_validator("strengths", "risks", "interview_questions", mode="after")
    @classmethod
    def _tidy_list(cls, values: list[str]) -> list[str]:
        """Trims, drops empties and repeats, and keeps the three asked for.

        A small model tends to answer with more than it was asked for, and to
        repeat an entry; the recruiter's panel has room for three, and the
        event contract says three.
        """
        cleaned: list[str] = []
        seen: set[str] = set()
        for item in values:
            text = item.strip()
            key = text.casefold()
            if not text or key in seen:
                continue
            seen.add(key)
            cleaned.append(text)
        return cleaned[:3]
