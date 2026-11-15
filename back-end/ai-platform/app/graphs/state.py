"""Pydantic state carried through the resume scoring graph."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.job_match import JobSpec, QualitativeEvaluationSchema
from app.schemas.resume import ResumeExtractionSchema
from app.services.document import IngestedDocument
from app.services.document.schemas import Chunk
from app.services.scoring.models import DeterministicScore


class ScoringState(BaseModel):
    """Everything the graph carries from one node to the next."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

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

    job_title: str = ""
    job_description_text: str = ""
    # The recruiter's own skill list and experience requirement. They let the
    # pipeline build a job spec without a language model.
    job_skills: list[str] = []
    job_years_of_experience: str | None = None
    # The language the narrative is written in (the recruiter's UI language).
    output_language: str = "en"

    # The ingested document: its chunks, its quality report and its language.
    ingested: IngestedDocument | None = None
    chunks: list[Chunk] = Field(default_factory=list)
    chunk_vectors: list[list[float]] = Field(default_factory=list)
    quality_ok: bool = True
    quality_issues: tuple[str, ...] = ()
    language: str | None = None
    document_method: str = "text"
    document_id: UUID | None = None
    # True when the extraction was not trustworthy and the document went to
    # the manual review queue instead of being scored.
    needs_review: bool = False

    # False when no language model is configured. The run then degrades to the
    # profile snapshot and the deterministic score (reported as "score only").
    llm_available: bool = False

    extracted: ResumeExtractionSchema | None = None
    job_spec: JobSpec | None = None
    resume_vector: list[float] | None = None
    job_vector: list[float] | None = None
    deterministic: DeterministicScore | None = None
    qualitative: QualitativeEvaluationSchema | None = None
    match_id: UUID | None = None
