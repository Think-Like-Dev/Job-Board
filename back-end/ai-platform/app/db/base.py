"""Import every SQLModel table so Alembic sees the full metadata."""

from sqlmodel import SQLModel

from app.models import ats, cancellation, documents, llm_config, outbox

__all__ = ["SQLModel", "ats", "cancellation", "documents", "llm_config", "outbox"]
