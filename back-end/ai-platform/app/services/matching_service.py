"""Deterministic score + qualitative LLM evaluation for one resume/JD pair."""

from __future__ import annotations

from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.exceptions import ResumeNotFound
from app.models.ats import ResumeAnalysis
from app.schemas.ats import EvaluateMatchRequest, EvaluateMatchResponse
from app.schemas.job_match import QualitativeEvaluationSchema
from app.schemas.resume import ResumeExtractionSchema
from app.schemas.scoring import ComponentScores
from app.services.embedding_service import EmbeddingService
from app.services.job_service import JobService
from app.services.match_store import upsert_match
from app.services.orchestrator import LLMOrchestrator
from app.services.prompts import EVALUATION_SYSTEM, evaluation_user_prompt
from app.services.scoring.engine import score_candidate


class MatchingService:
    def __init__(
        self,
        session: AsyncSession,
        orchestrator: LLMOrchestrator,
        embedder: EmbeddingService,
        job_service: JobService,
        settings: Settings,
    ) -> None:
        self._session = session
        self._orchestrator = orchestrator
        self._embedder = embedder
        self._job_service = job_service
        self._settings = settings

    async def evaluate(self, payload: EvaluateMatchRequest) -> EvaluateMatchResponse:
        resume = await self._session.get(ResumeAnalysis, payload.resume_analysis_id)
        if resume is None:
            raise ResumeNotFound(f"Resume analysis '{payload.resume_analysis_id}' was not found")

        extracted = ResumeExtractionSchema.model_validate(resume.extracted_data)
        resume_id = resume.id
        # Embed before the JD analysis: analyze() may roll back and expire `resume`.
        resume_vector = await self._embedder.ensure_resume_embedding(resume)
        job_record, spec = await self._job_service.analyze(
            payload.job_description_text, payload.job_id
        )
        job_vector = await self._embedder.ensure_job_embedding(job_record)
        deterministic = score_candidate(extracted, spec, resume_vector, job_vector)

        # No pooled connection should be held during the LLM call.
        await self._session.rollback()
        qualitative = await self._orchestrator.structured_output(
            QualitativeEvaluationSchema,
            system=EVALUATION_SYSTEM,
            user=evaluation_user_prompt(
                extracted, spec, deterministic.components, self._settings.max_text_chars
            ),
        )
        record = await upsert_match(
            self._session,
            application_id=payload.application_id,
            candidate_id=payload.candidate_id,
            job_id=payload.job_id,
            resume_analysis_id=resume_id,
            deterministic=deterministic,
            qualitative=qualitative,
        )

        return EvaluateMatchResponse(
            candidate_job_match_id=record.id,
            score=float(record.score),
            component_scores=ComponentScores.model_validate(record.component_scores),
            matching_skills=deterministic.matching_skills,
            missing_skills=deterministic.missing_skills,
            fit_analysis=qualitative.fit_analysis,
            strengths=qualitative.strengths,
            risks=qualitative.risks,
            interview_questions=qualitative.interview_questions,
            knockout_reason=deterministic.knockout_reason,
        )
