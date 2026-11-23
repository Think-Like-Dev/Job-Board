"""Structured JD requirements and the qualitative LLM evaluation."""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, Field


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
    fit_analysis: str = ""
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    interview_questions: list[str] = Field(default_factory=list)
