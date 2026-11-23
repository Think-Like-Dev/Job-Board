"""BYOK provider and credential request/response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProviderModelRead(BaseModel):
    id: UUID
    model_name: str
    display_name: str
    is_active: bool


class ProviderRead(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    models: list[ProviderModelRead] = Field(default_factory=list)


class CredentialCreate(BaseModel):
    provider_code: str = Field(min_length=2, max_length=50)
    api_key: str = Field(min_length=8, max_length=4096)


class CredentialRead(BaseModel):
    id: UUID
    provider_code: str
    provider_name: str
    key_last_four: str
    is_active: bool
    created_at: datetime
