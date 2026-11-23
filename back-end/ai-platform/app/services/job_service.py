"""Job description analysis and caching."""

from __future__ import annotations

import hashlib
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.constants import EXTRACTION_VERSION
from app.models.ats import JobAnalysis
from app.schemas.job_match import JobSpec
from app.services.orchestrator import LLMOrchestrator
from app.services.prompts import JOB_ANALYSIS_SYSTEM


class JobService:
    def __init__(
        self,
        session: AsyncSession,
        orchestrator: LLMOrchestrator,
        settings: Settings,
    ) -> None:
        self._session = session
        self._orchestrator = orchestrator
        self._settings = settings

    async def analyze(
        self, description: str, job_id: UUID | None = None
    ) -> tuple[JobAnalysis, JobSpec]:
        content_hash = hashlib.sha256(description.encode("utf-8")).hexdigest()
        cached = await self._find(content_hash)
        if cached is not None:
            return await self._with_job_id(cached, job_id)

        # Close the read transaction so the slow LLM call holds no pooled DB connection.
        await self._session.rollback()

        spec = await self._orchestrator.structured_output(
            JobSpec,
            system=JOB_ANALYSIS_SYSTEM,
            user=description[: self._settings.max_text_chars],
        )
        record = JobAnalysis(
            job_id=job_id,
            content_hash=content_hash,
            extraction_version=EXTRACTION_VERSION,
            extracted_data=spec.model_dump(mode="json"),
            summary=spec.summary,
        )
        self._session.add(record)
        try:
            await self._session.commit()
        except IntegrityError:
            # Another request stored the same JD first; use its row.
            await self._session.rollback()
            existing = await self._find(content_hash)
            if existing is None:
                raise
            return await self._with_job_id(existing, job_id)

        await self._session.refresh(record)
        return record, spec

    async def _with_job_id(
        self, record: JobAnalysis, job_id: UUID | None
    ) -> tuple[JobAnalysis, JobSpec]:
        if job_id is not None and record.job_id is None:
            record.job_id = job_id
            await self._session.commit()
        return record, JobSpec.model_validate(record.extracted_data)

    async def _find(self, content_hash: str) -> JobAnalysis | None:
        return (
            await self._session.exec(
                select(JobAnalysis).where(
                    JobAnalysis.content_hash == content_hash,
                    JobAnalysis.extraction_version == EXTRACTION_VERSION,
                )
            )
        ).first()
