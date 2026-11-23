"""Pydantic state carried through the resume scoring graph."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel

from app.schemas.job_match import JobSpec, QualitativeEvaluationSchema
from app.schemas.resume import ResumeExtractionSchema
from app.services.scoring.models import DeterministicScore


class ScoringState(BaseModel):
    application_id: UUID | None = None
    candidate_id: UUID | None = None
    job_id: UUID | None = None

    resume_file_id: UUID | None = None
    resume_filename: str | None = None
    resume_bytes: bytes | None = None
    resume_sha256: str | None = None
    resume_text: str = ""
    profile_snapshot: dict[str, Any] | None = None
    resume_analysis_id: UUID | None = None

    job_description_text: str = ""
    extracted: ResumeExtractionSchema | None = None
    job_spec: JobSpec | None = None
    resume_vector: list[float] | None = None
    job_vector: list[float] | None = None
    deterministic: DeterministicScore | None = None
    qualitative: QualitativeEvaluationSchema | None = None
    match_id: UUID | None = None
