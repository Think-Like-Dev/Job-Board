"""Applications the AI service must not score (or must stop scoring).

The core API cannot be read from this service, so a withdrawal or a rejection
travels over the broker and is recorded here. The scoring consumer checks this
table before it starts a run and again before it publishes a result.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel

from app.models.llm_config import created_at_column


class CancelledApplication(SQLModel, table=True):
    __tablename__ = "cancelled_applications"

    application_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), primary_key=True))
    reason: str | None = Field(sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(sa_column=created_at_column())
