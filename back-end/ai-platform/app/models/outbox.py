"""The AI service's own outbox.

A result is written to the outbox in the same transaction as the match it
describes, so a completed score can never be lost between "saved" and
"announced".
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel

from app.models.llm_config import uuid_pk


def _timestamp(nullable: bool) -> Column:
    return Column(
        DateTime(timezone=True),
        nullable=nullable,
        server_default=func.now(),
    )


class OutboxEvent(SQLModel, table=True):
    __tablename__ = "event_outbox"

    id: UUID = Field(sa_column=uuid_pk())
    aggregate_type: str = Field(sa_column=Column(String(100), nullable=False))
    aggregate_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=False, index=True))
    event_type: str = Field(sa_column=Column(String(100), nullable=False))
    routing_key: str = Field(sa_column=Column(String(100), nullable=False))
    payload: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    status: str = Field(sa_column=Column(String(20), nullable=False, server_default="PENDING"))
    attempts: int = Field(sa_column=Column(Integer, nullable=False, server_default="0"))
    last_error: str | None = Field(sa_column=Column(Text, nullable=True))
    next_attempt_at: datetime = Field(sa_column=_timestamp(nullable=False))
    published_at: datetime | None = Field(sa_column=_timestamp(nullable=True))
    created_at: datetime = Field(sa_column=_timestamp(nullable=False))
