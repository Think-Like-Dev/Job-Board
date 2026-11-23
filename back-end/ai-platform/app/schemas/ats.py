"""ATS request/response schemas."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.resume import ResumeExtractionSchema
from app.schemas.scoring import ComponentScores


class ParseResumeResponse(BaseModel):
    resume_analysis_id: UUID
    sha256: str
    cached: bool
    extracted: ResumeExtractionSchema
    summary: str


class EvaluateMatchRequest(BaseModel):
    resume_analysis_id: UUID
    job_description_text: str = Field(min_length=50, max_length=100_000)
    application_id: UUID | None = None
    candidate_id: UUID | None = None
    job_id: UUID | None = None


class EvaluateMatchResponse(BaseModel):
    candidate_job_match_id: UUID
    score: float
    component_scores: ComponentScores
    matching_skills: list[str]
    missing_skills: list[str]
    fit_analysis: str
    strengths: list[str]
    risks: list[str]
    interview_questions: list[str]
    knockout_reason: str | None = None
