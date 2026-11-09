from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session

router = APIRouter()


@router.get("/health", summary="Service health check")
def health() -> dict[str, str]:
    """Liveness probe used by Compose and local checks."""
    settings = get_settings()
    return {"status": "ok", "environment": settings.environment}


@router.get("/health/ready", summary="Database readiness check")
async def ready(session: AsyncSession = Depends(get_session)) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database is not reachable") from exc
    return {"status": "ok", "database": "ok"}
