"""Nodes for the resume scoring graph. Services are injected as closures."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.constants import EXTRACTION_VERSION
from app.core.exceptions import UnreadableDocument, UnsupportedFileType
from app.graphs.state import ScoringState
from app.models.ats import ResumeAnalysis
from app.schemas.job_match import QualitativeEvaluationSchema
from app.schemas.resume import EducationEntry, ExperienceEntry, ResumeExtractionSchema
from app.services.embedding_service import EmbeddingService
from app.services.job_service import JobService
from app.services.match_store import upsert_match
from app.services.orchestrator import LLMOrchestrator
from app.services.parser import DocumentParser
from app.services.prompts import (
    EVALUATION_SYSTEM,
    RESUME_EXTRACTION_SYSTEM,
    evaluation_user_prompt,
)
from app.services.scoring.engine import score_candidate


@dataclass(frozen=True)
class GraphDependencies:
    session: AsyncSession
    orchestrator: LLMOrchestrator
    embedder: EmbeddingService
    parser: DocumentParser
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


def build_nodes(deps: GraphDependencies) -> dict[str, Any]:
    async def inspect_text(state: ScoringState) -> dict[str, Any]:
        if state.resume_bytes is not None:
            try:
                document = await deps.parser.extract(state.resume_filename, state.resume_bytes)
            except UnreadableDocument, UnsupportedFileType:
                if not state.profile_snapshot:
                    raise
                snapshot_seed = json.dumps(state.profile_snapshot, sort_keys=True)
                return {
                    "resume_text": "",
                    "resume_sha256": hashlib.sha256(snapshot_seed.encode("utf-8")).hexdigest(),
                }
            # The fallback uses the snapshot, so the snapshot must be part of the cache key.
            if len(document.text) < deps.settings.min_resume_text_chars and state.profile_snapshot:
                seed = f"{document.text}\n{json.dumps(state.profile_snapshot, sort_keys=True)}"
                return {
                    "resume_text": document.text,
                    "resume_sha256": hashlib.sha256(seed.encode("utf-8")).hexdigest(),
                }
            return {
                "resume_text": document.text,
                "resume_sha256": hashlib.sha256(state.resume_bytes).hexdigest(),
            }
        seed = state.resume_text
        if len(seed) < deps.settings.min_resume_text_chars and state.profile_snapshot is not None:
            seed = f"{seed}\n{json.dumps(state.profile_snapshot, sort_keys=True)}"
        return {
            "resume_sha256": hashlib.sha256(seed.encode("utf-8")).hexdigest(),
        }

    async def profile_fallback(state: ScoringState) -> dict[str, Any]:
        if not state.profile_snapshot:
            raise UnreadableDocument("Resume is unreadable and no profile snapshot was supplied")
        return {"extracted": _snapshot_to_extraction(state.profile_snapshot)}

    async def llm_extraction(state: ScoringState) -> dict[str, Any]:
        extracted = await deps.orchestrator.structured_output(
            ResumeExtractionSchema,
            system=RESUME_EXTRACTION_SYSTEM,
            user=state.resume_text[: deps.settings.max_text_chars],
        )
        return {"extracted": extracted}

    def route_after_inspect(state: ScoringState) -> str:
        if len(state.resume_text) >= deps.settings.min_resume_text_chars:
            return "extract"
        if state.profile_snapshot:
            return "fallback"
        raise UnreadableDocument("Resume has too little text and no profile snapshot was supplied")

    async def persist_resume(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None:
            raise UnreadableDocument("Resume extraction did not produce any data")

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
        return {"resume_analysis_id": record.id, "resume_sha256": sha256}

    async def embedding(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None or state.resume_analysis_id is None:
            raise UnreadableDocument("Resume extraction did not produce any data")
        record = await deps.session.get(ResumeAnalysis, state.resume_analysis_id)
        if record is None:
            raise UnreadableDocument("Resume analysis disappeared before embedding")
        resume_vector = await deps.embedder.ensure_resume_embedding(record)
        job_record, job_spec = await deps.job_service.analyze(
            state.job_description_text, state.job_id
        )
        job_vector = await deps.embedder.ensure_job_embedding(job_record)
        return {
            "resume_vector": resume_vector,
            "job_vector": job_vector,
            "job_spec": job_spec,
        }

    async def deterministic_scoring(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None or state.job_spec is None:
            raise UnreadableDocument("Scoring requires both a resume and a job specification")
        result = score_candidate(
            state.extracted,
            state.job_spec,
            state.resume_vector,
            state.job_vector,
        )
        return {"deterministic": result}

    async def evaluation(state: ScoringState) -> dict[str, Any]:
        if state.extracted is None or state.job_spec is None or state.deterministic is None:
            raise UnreadableDocument("Evaluation requires a deterministic score first")
        # No pooled connection should be held during the LLM call.
        await deps.session.rollback()
        qualitative = await deps.orchestrator.structured_output(
            QualitativeEvaluationSchema,
            system=EVALUATION_SYSTEM,
            user=evaluation_user_prompt(
                state.extracted,
                state.job_spec,
                state.deterministic.components,
                deps.settings.max_text_chars,
            ),
        )
        return {"qualitative": qualitative}

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
        "inspect_text": inspect_text,
        "profile_fallback": profile_fallback,
        "llm_extraction": llm_extraction,
        "route_after_inspect": route_after_inspect,
        "persist_resume": persist_resume,
        "embedding": embedding,
        "deterministic_scoring": deterministic_scoring,
        "evaluation": evaluation,
        "persist_match": persist_match,
    }
