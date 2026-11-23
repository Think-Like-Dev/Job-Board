"""Nodes for the resume scoring graph. Services are injected as closures.

The graph follows the document pipeline:

    ingest -> embed_chunks -> store_document -> (extract | manual_review)
           -> persist_resume -> embed_job -> deterministic_scoring
           -> evaluation -> persist_match

`manual_review` is a terminal branch: a document the pipeline could not read
well enough is kept for a human instead of being scored.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.constants import EXTRACTION_VERSION, WEIGHTS_VERSION
from app.core.exceptions import (
    AllProvidersExhausted,
    NoActiveProvider,
    UnreadableDocument,
)
from app.graphs.state import ScoringState
from app.models.ats import CandidateJobMatch, ResumeAnalysis
from app.schemas.job_match import QualitativeEvaluationSchema
from app.schemas.resume import EducationEntry, ExperienceEntry, ResumeExtractionSchema
from app.services.canonical import is_empty_extraction, render_resume_text
from app.services.document import ingest_document
from app.services.document_store import DocumentStore
from app.services.embedding_service import EmbeddingService
from app.services.evaluation_quality import sanitise_evaluation
from app.services.extraction_quality import clean_extraction
from app.services.job_service import JobService
from app.services.job_spec import build_deterministic_job_spec
from app.services.match_store import upsert_match
from app.services.orchestrator import LLMOrchestrator
from app.services.prompts import (
    EVALUATION_SYSTEM,
    RESUME_EXTRACTION_SYSTEM,
    evaluation_user_prompt,
)
from app.services.scoring.engine import score_candidate

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GraphDependencies:
    session: AsyncSession
    orchestrator: LLMOrchestrator
    embedder: EmbeddingService
    job_service: JobService
    settings: Settings


def _snapshot_to_extraction(snapshot: dict[str, Any]) -> ResumeExtractionSchema:
    experience = []
    for item in snapshot.get("experience", []):
        description = item.get("description")
        experience.append(
            ExperienceEntry(
                company=item.get("companyName", ""),
                role=item.get("jobTitle", ""),
                start_date=item.get("startDate"),
                end_date=item.get("endDate"),
                achievements=[description] if description else [],
            )
        )

    education = []
    for item in snapshot.get("education", []):
        end_date = str(item.get("endDate") or "")
        year = int(end_date[:4]) if end_date[:4].isdigit() else None
        education.append(
            EducationEntry(
                institution=item.get("institution", ""),
                degree=item.get("degree", ""),
                field_of_study=item.get("fieldOfStudy"),
                graduation_year=year,
            )
        )

    return ResumeExtractionSchema(
        first_name=snapshot.get("firstName"),
        last_name=snapshot.get("lastName"),
        email=snapshot.get("email"),
        phone=snapshot.get("phone"),
        location=snapshot.get("currentLocation"),
        skills=[item["name"] for item in snapshot.get("skills", []) if item.get("name")],
        experience=experience,
        education=education,
        certifications=[
            item["title"] for item in snapshot.get("certifications", []) if item.get("title")
        ],
        executive_summary="Candidate profile snapshot (resume text was unreadable).",
    )


async def _stored_analysis(session: AsyncSession, sha256: str | None) -> ResumeAnalysis | None:
    """The extraction already stored for this file, if there is one."""
    if not sha256:
        return None
    return (
        await session.exec(
            select(ResumeAnalysis).where(
                ResumeAnalysis.sha256 == sha256,
                ResumeAnalysis.extraction_version == EXTRACTION_VERSION,
            )
        )
    ).first()


def _has_narrative(evaluation: QualitativeEvaluationSchema) -> bool:
    return bool(
        evaluation.fit_analysis
        or evaluation.strengths
        or evaluation.risks
        or evaluation.interview_questions
    )


async def _stored_evaluation(
    session: AsyncSession,
    application_id: UUID | None,
    resume_analysis_id: UUID | None,
) -> QualitativeEvaluationSchema | None:
    """The narrative already stored for this application and resume.

    A valid narrative is reused so a re-review cannot flip `SCORED` to
    `SCORE_ONLY` (or the reverse). An empty one is retried: it costs one call
    and may still produce a usable assessment.
    """
    if application_id is None or resume_analysis_id is None:
        return None
    record = (
        await session.exec(
            select(CandidateJobMatch).where(
                CandidateJobMatch.application_id == application_id,
                CandidateJobMatch.resume_analysis_id == resume_analysis_id,
                CandidateJobMatch.weights_version == WEIGHTS_VERSION,
            )
        )
    ).first()
    if record is None or not record.qualitative:
        return None
    try:
        evaluation = QualitativeEvaluationSchema.model_validate(record.qualitative)
    except Exception:
        return None
    evaluation = sanitise_evaluation(evaluation)
    return evaluation if _has_narrative(evaluation) else None


def build_nodes(deps: GraphDependencies) -> dict[str, Any]:
    store = DocumentStore(deps.embedder)

    async def ingest(state: ScoringState) -> dict[str, Any]:
        """Reads the document: extract, assess, normalise, chunk."""
        ingested = ingest_document(
            state.resume_filename,
            state.resume_bytes or b"",
            deps.settings,
        )

        return {
            "ingested": ingested,
            "chunks": ingested.chunks,
            "resume_text": ingested.normalized_text,
            "quality_ok": ingested.quality.ok,
            "quality_issues": ingested.quality.issues,
            "language": ingested.quality.language,
            "document_method": ingested.document.method,
            "resume_sha256": hashlib.sha256(state.resume_bytes or b"").hexdigest(),
        }

    async def embed_chunks(state: ScoringState) -> dict[str, Any]:
        """Embeds every chunk as a passage."""
        if not state.chunks:
            return {"chunk_vectors": []}

        if not await deps.embedder.has_embedding_provider():
            return {"chunk_vectors": []}

        vectors: list[list[float]] = []
        for chunk in state.chunks:
            try:
                vectors.append(await deps.embedder.embed_passage(chunk.text))
            except Exception as exc:
                logger.warning("Could not embed a chunk: %s", exc)
                vectors.append([])

        return {"chunk_vectors": vectors}

    async def store_document(state: ScoringState) -> dict[str, Any]:
        """Stores the document, its chunks and any review entry."""
        if state.ingested is None:
            return {}

        document = await store.store(
            deps.session,
            state.ingested,
            application_id=state.application_id,
            resume_file_id=state.resume_file_id,
            sha256=state.resume_sha256,
        )
        # Commit the document before anything else touches the session: the
        # language model steps release their read transaction with a rollback,
        # which would otherwise take the document with them.
        await deps.session.commit()

        return {"document_id": document.id, "needs_review": not state.quality_ok}

    def route_after_ingest(state: ScoringState) -> str:
        """A document that could not be read goes to the review queue."""
        if not state.quality_ok:
            return "manual_review"
        return "extract"

    async def manual_review(state: ScoringState) -> dict[str, Any]:
        """The terminal branch for an unreadable or empty document."""
        reason = "; ".join(state.quality_issues) or ("the extraction produced no candidate data")
        logger.warning(
            "Application %s needs a manual review: %s",
            state.application_id,
            reason,
        )
        return {"needs_review": True}

    async def llm_extraction(state: ScoringState) -> dict[str, Any]:
        stored = await _stored_analysis(deps.session, state.resume_sha256)
        if stored is not None:
            # The same file was extracted before: reuse it. A re-review must
            # not depend on whether the model succeeds this time.
            logger.info(
                "Reusing stored resume analysis %s for %s",
                stored.id,
                (state.resume_filename or state.resume_sha256 or "")[:60],
            )
            stored_extracted = ResumeExtractionSchema.model_validate(stored.extracted_data)
            extracted = clean_extraction(stored_extracted, state.resume_text)
            if not stored.canonical_text or extracted != stored_extracted:
                # Backfill the rendering, and persist the clean-up so the next
                # run and the embeddings see the same data.
                stored.extracted_data = extracted.model_dump(mode="json")
                stored.canonical_text = render_resume_text(extracted)
                stored.summary = extracted.executive_summary
                await deps.session.commit()
            return {"extracted": extracted, "resume_analysis_id": stored.id}

        if not state.llm_available and state.profile_snapshot:
            # No language model: the profile snapshot is the structured
            # candidate data.
            return {
                "extracted": clean_extraction(
                    _snapshot_to_extraction(state.profile_snapshot),
                    state.resume_text,
                )
            }
        try:
            extracted = await deps.orchestrator.structured_output(
                ResumeExtractionSchema,
                system=RESUME_EXTRACTION_SYSTEM,
                user=state.resume_text[: deps.settings.max_text_chars],
            )
        except NoActiveProvider, AllProvidersExhausted:
            if not state.profile_snapshot:
                raise
            return {
                "extracted": clean_extraction(
                    _snapshot_to_extraction(state.profile_snapshot),
                    state.resume_text,
                )
            }
        return {"extracted": clean_extraction(extracted, state.resume_text)}

    async def persist_resume(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None:
            raise UnreadableDocument("Resume extraction did not produce any data")

        needs_review = is_empty_extraction(state.extracted)
        if state.resume_analysis_id is not None:
            return {
                "resume_analysis_id": state.resume_analysis_id,
                "resume_sha256": state.resume_sha256,
                "needs_review": needs_review,
            }

        sha256 = (
            state.resume_sha256 or hashlib.sha256(state.resume_text.encode("utf-8")).hexdigest()
        )
        record = (
            await deps.session.exec(
                select(ResumeAnalysis).where(
                    ResumeAnalysis.sha256 == sha256,
                    ResumeAnalysis.extraction_version == EXTRACTION_VERSION,
                )
            )
        ).first()
        if record is None:
            record = ResumeAnalysis(
                resume_file_id=state.resume_file_id,
                source_filename=state.resume_filename,
                sha256=sha256,
                extraction_version=EXTRACTION_VERSION,
                raw_text=state.resume_text[: deps.settings.max_text_chars],
                extracted_data=state.extracted.model_dump(mode="json"),
                canonical_text=render_resume_text(state.extracted),
                summary=state.extracted.executive_summary,
            )
            deps.session.add(record)
            try:
                await deps.session.commit()
            except IntegrityError:
                # A concurrent worker stored the same resume first.
                await deps.session.rollback()
                record = (
                    await deps.session.exec(
                        select(ResumeAnalysis).where(
                            ResumeAnalysis.sha256 == sha256,
                            ResumeAnalysis.extraction_version == EXTRACTION_VERSION,
                        )
                    )
                ).first()
                if record is None:
                    raise
            else:
                await deps.session.refresh(record)
        return {
            "resume_analysis_id": record.id,
            "resume_sha256": sha256,
            "needs_review": needs_review,
        }

    def route_after_extraction(state: ScoringState) -> str:
        """An extraction with no candidate data is not scored."""
        if state.needs_review or is_empty_extraction(state.extracted):
            return "manual_review"
        return "score"

    async def embed_job(state: ScoringState) -> dict[str, Any]:
        """The job spec and the job vector."""
        try:
            job_record, job_spec = await deps.job_service.analyze(
                state.job_description_text,
                state.job_id,
                title=state.job_title,
                skills=state.job_skills,
                years=state.job_years_of_experience,
            )
        except NoActiveProvider, AllProvidersExhausted:
            # No language model: the recruiter's own skill list and experience
            # requirement are enough to score against. The embedding of the
            # job does not need a model, so the semantic part of the score
            # still works.
            job_spec = build_deterministic_job_spec(
                title=state.job_title,
                description_text=state.job_description_text,
                skills=state.job_skills,
                years_of_experience=state.job_years_of_experience,
            )
            job_record = await deps.job_service.store_spec(
                state.job_description_text,
                job_spec,
                state.job_id,
                title=state.job_title,
                skills=state.job_skills,
                years=state.job_years_of_experience,
            )
            job_vector = await deps.embedder.ensure_job_embedding(job_record)
            return {"job_spec": job_spec, "job_vector": job_vector}

        job_vector = await deps.embedder.ensure_job_embedding(job_record)
        return {"job_spec": job_spec, "job_vector": job_vector}

    async def deterministic_scoring(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None or state.job_spec is None:
            raise UnreadableDocument("Scoring requires both a resume and a job specification")
        result = score_candidate(
            state.extracted,
            state.job_spec,
            state.chunk_vectors,
            state.job_vector,
        )
        return {"deterministic": result}

    async def evaluation(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None or state.job_spec is None or state.deterministic is None:
            raise UnreadableDocument("Evaluation requires a deterministic score first")

        cached = await _stored_evaluation(
            deps.session, state.application_id, state.resume_analysis_id
        )
        if cached is not None:
            logger.info("Reusing the stored evaluation for application %s", state.application_id)
            return {"qualitative": cached}

        # No pooled connection should be held during the LLM call.
        await deps.session.rollback()
        try:
            qualitative = await deps.orchestrator.structured_output(
                QualitativeEvaluationSchema,
                system=EVALUATION_SYSTEM,
                user=evaluation_user_prompt(
                    state.extracted,
                    state.job_spec,
                    deps.settings.max_text_chars,
                    state.output_language,
                ),
            )
        except NoActiveProvider, AllProvidersExhausted:
            # The deterministic score is still valid; the run is reported as
            # "score only" instead of "scored".
            qualitative = QualitativeEvaluationSchema()
        return {"qualitative": sanitise_evaluation(qualitative)}

    async def persist_match(state: ScoringState) -> dict[str, Any]:
        if (
            state.resume_analysis_id is None
            or state.deterministic is None
            or state.qualitative is None
        ):
            raise UnreadableDocument("Cannot persist a match without a resume analysis")
        record = await upsert_match(
            deps.session,
            application_id=state.application_id,
            candidate_id=state.candidate_id,
            job_id=state.job_id,
            resume_analysis_id=state.resume_analysis_id,
            deterministic=state.deterministic,
            qualitative=state.qualitative,
        )
        return {"match_id": record.id}

    return {
        "ingest": ingest,
        "embed_chunks": embed_chunks,
        "store_document": store_document,
        "route_after_ingest": route_after_ingest,
        "manual_review": manual_review,
        "llm_extraction": llm_extraction,
        "persist_resume": persist_resume,
        "route_after_extraction": route_after_extraction,
        "embed_job": embed_job,
        "deterministic_scoring": deterministic_scoring,
        "evaluation": evaluation,
        "persist_match": persist_match,
    }
