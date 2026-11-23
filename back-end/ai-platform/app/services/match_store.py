"""Shared persistence for candidate/job matches (HTTP + graph)."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.constants import WEIGHTS_VERSION
from app.models.ats import CandidateJobMatch
from app.schemas.job_match import QualitativeEvaluationSchema
from app.services.scoring.models import DeterministicScore

_CENT = Decimal("0.01")


async def upsert_match(
    session: AsyncSession,
    *,
    application_id: UUID | None,
    candidate_id: UUID | None,
    job_id: UUID | None,
    resume_analysis_id: UUID,
    deterministic: DeterministicScore,
    qualitative: QualitativeEvaluationSchema,
) -> CandidateJobMatch:
    values = {
        "application_id": application_id,
        "candidate_id": candidate_id,
        "job_id": job_id,
        "resume_analysis_id": resume_analysis_id,
        "score": Decimal(str(deterministic.score)).quantize(_CENT),
        "matching_skills": deterministic.matching_skills,
        "missing_skills": deterministic.missing_skills,
        "ai_summary": qualitative.fit_analysis,
        "component_scores": deterministic.components.model_dump(),
        "weights_version": WEIGHTS_VERSION,
        "knockout_reason": deterministic.knockout_reason,
    }

    if application_id is None:
        # Ad-hoc evaluations may legitimately repeat; no unique key to conflict on.
        record = CandidateJobMatch(**values)
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return record

    # One row per application: an at-least-once redelivery must update, not 500.
    statement = (
        pg_insert(CandidateJobMatch)
        .values(**values)
        .on_conflict_do_update(
            index_elements=[CandidateJobMatch.application_id],
            set_={key: value for key, value in values.items() if key != "application_id"},
        )
        .returning(CandidateJobMatch.id)
    )
    result = await session.execute(statement)
    record_id = result.scalar_one()
    await session.commit()
    record = (
        await session.exec(select(CandidateJobMatch).where(CandidateJobMatch.id == record_id))
    ).one()
    return record
