"""Resume analysis, embeddings, and candidate/job match records."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Column,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel

from app.core.constants import EMBEDDING_DIM, EXTRACTION_VERSION, WEIGHTS_VERSION
from app.models.llm_config import created_at_column, uuid_pk


class ResumeAnalysis(SQLModel, table=True):
    __tablename__ = "resume_analysis"
    __table_args__ = (
        UniqueConstraint("sha256", "extraction_version", name="resume_analysis_sha_version_key"),
    )

    id: UUID = Field(sa_column=uuid_pk())
    resume_file_id: UUID | None = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    )
    source_filename: str | None = Field(sa_column=Column(String(255), nullable=True))
    sha256: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    extraction_version: str = Field(
        sa_column=Column(
            String(20),
            nullable=False,
            server_default=text(f"'{EXTRACTION_VERSION}'"),
        )
    )
    raw_text: str = Field(sa_column=Column(Text, nullable=False, server_default=text("''")))
    extracted_data: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    summary: str = Field(sa_column=Column(Text, nullable=False, server_default=text("''")))
    created_at: datetime = Field(sa_column=created_at_column())


class ResumeEmbedding(SQLModel, table=True):
    __tablename__ = "resume_embeddings"
    __table_args__ = (
        UniqueConstraint("resume_analysis_id", "model", name="resume_embeddings_resume_model_key"),
        Index(
            "ix_resume_embeddings_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: UUID = Field(sa_column=uuid_pk())
    resume_analysis_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("resume_analysis.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    embedding: list[float] = Field(sa_column=Column(Vector(EMBEDDING_DIM), nullable=False))
    model: str = Field(sa_column=Column(String(150), nullable=False))
    created_at: datetime = Field(sa_column=created_at_column())


class JobAnalysis(SQLModel, table=True):
    __tablename__ = "job_analysis"
    __table_args__ = (
        UniqueConstraint(
            "content_hash", "extraction_version", name="job_analysis_hash_version_key"
        ),
    )

    id: UUID = Field(sa_column=uuid_pk())
    job_id: UUID | None = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True))
    content_hash: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    extraction_version: str = Field(
        sa_column=Column(
            String(20),
            nullable=False,
            server_default=text(f"'{EXTRACTION_VERSION}'"),
        )
    )
    extracted_data: dict[str, Any] = Field(sa_column=Column(JSONB, nullable=False))
    summary: str = Field(sa_column=Column(Text, nullable=False, server_default=text("''")))
    created_at: datetime = Field(sa_column=created_at_column())


class JobEmbedding(SQLModel, table=True):
    __tablename__ = "job_embeddings"
    __table_args__ = (
        UniqueConstraint("job_id", "model", name="job_embeddings_job_model_key"),
        Index(
            "ix_job_embeddings_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: UUID = Field(sa_column=uuid_pk())
    job_id: UUID = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=False, index=True))
    embedding: list[float] = Field(sa_column=Column(Vector(EMBEDDING_DIM), nullable=False))
    model: str = Field(sa_column=Column(String(150), nullable=False))
    created_at: datetime = Field(sa_column=created_at_column())


class CandidateJobMatch(SQLModel, table=True):
    __tablename__ = "candidate_job_match"

    id: UUID = Field(sa_column=uuid_pk())
    application_id: UUID | None = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, unique=True, index=True)
    )
    candidate_id: UUID | None = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    )
    job_id: UUID | None = Field(sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True))
    resume_analysis_id: UUID | None = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("resume_analysis.id", ondelete="SET NULL"),
            nullable=True,
        )
    )
    score: Decimal = Field(sa_column=Column(Numeric(5, 2), nullable=False))
    matching_skills: list[str] = Field(
        sa_column=Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    )
    missing_skills: list[str] = Field(
        sa_column=Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    )
    ai_summary: str = Field(sa_column=Column(Text, nullable=False, server_default=text("''")))
    component_scores: dict[str, float] = Field(
        sa_column=Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    )
    weights_version: str = Field(
        sa_column=Column(String(20), nullable=False, server_default=text(f"'{WEIGHTS_VERSION}'"))
    )
    knockout_reason: str | None = Field(sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(sa_column=created_at_column())
