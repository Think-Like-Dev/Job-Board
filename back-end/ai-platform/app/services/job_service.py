"""Job description analysis and caching."""

from __future__ import annotations

import hashlib
import json
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings
from app.core.constants import EXTRACTION_VERSION
from app.models.ats import JobAnalysis
from app.schemas.job_match import JobSpec
from app.services.job_spec import infer_seniority, parse_min_years
from app.services.orchestrator import LLMOrchestrator
from app.services.prompts import JOB_ANALYSIS_SYSTEM


def _content_hash(
    description: str,
    title: str | None = None,
    skills: list[str] | None = None,
    years: str | None = None,
) -> str:
    """The cache key: the description plus the requirements the recruiter typed.

    Two jobs with the same description but different skills or experience are
    different requirements and must not share one analysis.
    """
    payload = json.dumps(
        {
            "description": description,
            "title": (title or "").strip(),
            "skills": sorted(
                {skill.strip().casefold() for skill in (skills or []) if skill.strip()}
            ),
            "years": (years or "").strip(),
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _apply_requirements(
    spec: JobSpec,
    *,
    title: str | None,
    skills: list[str] | None,
    years: str | None,
) -> JobSpec:
    """Makes the recruiter's own requirements win over the model's reading."""
    min_years = parse_min_years(years) if years else spec.min_years_experience
    recruiter_skills = [skill.strip() for skill in (skills or []) if skill.strip()]
    if recruiter_skills:
        must_have = recruiter_skills
        nice_to_have = [
            skill
            for skill in spec.nice_to_have_skills
            if skill.casefold() not in {item.casefold() for item in must_have}
        ]
    else:
        must_have = spec.must_have_skills
        nice_to_have = spec.nice_to_have_skills

    resolved_title = (title or spec.title or "").strip()
    return spec.model_copy(
        update={
            "title": resolved_title,
            "seniority": infer_seniority(resolved_title, min_years),
            "min_years_experience": min_years,
            "must_have_skills": must_have,
            "nice_to_have_skills": nice_to_have,
        }
    )


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
        self,
        description: str,
        job_id: UUID | None = None,
        *,
        title: str | None = None,
        skills: list[str] | None = None,
        years: str | None = None,
    ) -> tuple[JobAnalysis, JobSpec]:
        content_hash = _content_hash(description, title, skills, years)
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
        spec = _apply_requirements(spec, title=title, skills=skills, years=years)
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

    async def store_spec(
        self,
        description: str,
        spec: JobSpec,
        job_id: UUID | None = None,
        *,
        title: str | None = None,
        skills: list[str] | None = None,
        years: str | None = None,
    ) -> JobAnalysis:
        """Stores a job analysis that no language model produced.

        The embedding of the job is what the semantic score needs, and the
        embedding hangs on an analysis row. Without a model the recruiter's
        own skills and the job text are enough to build that row, so the
        semantic part of the score still works.
        """
        content_hash = _content_hash(
            description,
            title or spec.title,
            skills if skills is not None else spec.must_have_skills,
            years if years is not None else str(spec.min_years_experience),
        )
        cached = await self._find(content_hash)
        if cached is not None:
            return await self._with_job_id(cached, job_id)

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
        return record

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
