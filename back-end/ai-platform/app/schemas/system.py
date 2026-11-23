"""Operational audit schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ModelFailureRead(BaseModel):
    id: UUID
    provider_code: str | None = None
    model_name: str | None = None
    error_type: str
    error_message: str
    created_at: datetime
