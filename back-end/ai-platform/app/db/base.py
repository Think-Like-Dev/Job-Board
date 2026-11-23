"""Import every SQLModel table so Alembic sees the full metadata."""

from sqlmodel import SQLModel

from app.models import ats, llm_config

__all__ = ["SQLModel", "ats", "llm_config"]
