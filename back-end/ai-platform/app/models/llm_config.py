"""BYOK provider catalog, credentials, and failure audit."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


def uuid_pk() -> Column:
    return Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


def created_at_column() -> Column:
    return Column(DateTime(timezone=True), nullable=False, server_default=func.now())


def updated_at_column() -> Column:
    return Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class AIProvider(SQLModel, table=True):
    __tablename__ = "ai_providers"

    id: UUID = Field(sa_column=uuid_pk())
    name: str = Field(sa_column=Column(String(100), nullable=False))
    code: str = Field(sa_column=Column(String(50), nullable=False, unique=True, index=True))
    is_active: bool = Field(sa_column=Column(Boolean, nullable=False, server_default=text("true")))
    created_at: datetime = Field(sa_column=created_at_column())
    updated_at: datetime = Field(sa_column=updated_at_column())


class AIModel(SQLModel, table=True):
    __tablename__ = "ai_models"
    __table_args__ = (
        UniqueConstraint("provider_id", "model_name", name="ai_models_provider_model_key"),
    )

    id: UUID = Field(sa_column=uuid_pk())
    provider_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("ai_providers.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    model_name: str = Field(sa_column=Column(String(150), nullable=False))
    display_name: str = Field(sa_column=Column(String(150), nullable=False))
    is_active: bool = Field(sa_column=Column(Boolean, nullable=False, server_default=text("true")))
    released_at: datetime | None = Field(sa_column=Column(DateTime(timezone=True), nullable=True))
    deprecated_at: datetime | None = Field(sa_column=Column(DateTime(timezone=True), nullable=True))


class AICredential(SQLModel, table=True):
    __tablename__ = "ai_credentials"

    id: UUID = Field(sa_column=uuid_pk())
    provider_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("ai_providers.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    encrypted_api_key: str = Field(sa_column=Column(Text, nullable=False))
    key_last_four: str = Field(sa_column=Column(String(4), nullable=False))
    is_active: bool = Field(sa_column=Column(Boolean, nullable=False, server_default=text("true")))
    created_at: datetime = Field(sa_column=created_at_column())
    updated_at: datetime = Field(sa_column=updated_at_column())


class AIModelFailure(SQLModel, table=True):
    __tablename__ = "ai_model_failures"

    id: UUID = Field(sa_column=uuid_pk())
    credential_id: UUID | None = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("ai_credentials.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        )
    )
    model_id: UUID | None = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("ai_models.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        )
    )
    error_type: str = Field(sa_column=Column(String(100), nullable=False))
    error_message: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(sa_column=created_at_column())
