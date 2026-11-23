from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import require_internal_token
from app.db.session import get_session
from app.models.llm_config import AIModel, AIModelFailure, AIProvider
from app.schemas.system import ModelFailureRead

router = APIRouter(prefix="/system", dependencies=[Depends(require_internal_token)])


@router.get(
    "/failures",
    response_model=list[ModelFailureRead],
    summary="Recent provider/model failures",
)
async def list_failures(
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[ModelFailureRead]:
    statement = (
        select(AIModelFailure, AIModel, AIProvider)
        .outerjoin(AIModel, AIModelFailure.model_id == AIModel.id)
        .outerjoin(AIProvider, AIModel.provider_id == AIProvider.id)
        .order_by(AIModelFailure.created_at.desc())
        .limit(limit)
    )
    rows = (await session.exec(statement)).all()
    return [
        ModelFailureRead(
            id=failure.id,
            provider_code=provider.code if provider else None,
            model_name=model.model_name if model else None,
            error_type=failure.error_type,
            error_message=failure.error_message,
            created_at=failure.created_at,
        )
        for failure, model, provider in rows
    ]
