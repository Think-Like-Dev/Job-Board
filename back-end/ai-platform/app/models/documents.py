"""The ingested document, its chunks and the manual review queue.

The pipeline keeps the original text, the normalised text, the chunks and the
quality report side by side. A better extractor can be dropped in later
without asking anybody to upload their CV again.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel

from app.models.ats import EMBEDDING_DIM
from app.models.llm_config import created_at_column, uuid_pk

# The document was read and can be scored.
STATUS_ACCEPTED = "accepted"
# The extraction was not trustworthy; a human has to look at it.
STATUS_NEEDS_REVIEW = "needs_review"

# The review queue entry is still open.
REVIEW_OPEN = "open"
REVIEW_RESOLVED = "resolved"


class ResumeDocument(SQLModel, table=True):
    """One ingested resume."""

    __tablename__ = "resume_documents"

    id: UUID = Field(sa_column=uuid_pk())
    # The file id in the core API, when the document came from an application.
    resume_file_id: UUID | None = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    )
    application_id: UUID | None = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    )
    # The content hash, so the same file is never ingested twice.
    sha256: str = Field(sa_column=Column(String(64), nullable=False, index=True))
    filename: str | None = Field(sa_column=Column(Text, nullable=True))
    suffix: str = Field(sa_column=Column(String(10), nullable=False))
    # The text exactly as it was extracted.
    raw_text: str = Field(sa_column=Column(Text, nullable=False, server_default="''"))
    # The normalised text: this is what gets chunked and embedded.
    normalized_text: str = Field(sa_column=Column(Text, nullable=False, server_default="''"))
    language: str | None = Field(sa_column=Column(String(10), nullable=True))
    # How the text was obtained: `text`, `hybrid`, `ocr` or `empty`.
    method: str = Field(sa_column=Column(String(20), nullable=False, server_default="text"))
    page_count: int = Field(sa_column=Column(Integer, nullable=False, server_default="0"))
    # The quality report: densities, coverage, confidence and the issues found.
    quality: dict[str, Any] = Field(
        sa_column=Column(JSONB, nullable=False, server_default="'{}'::jsonb")
    )
    status: str = Field(
        sa_column=Column(String(20), nullable=False, server_default=STATUS_ACCEPTED)
    )
    created_at: datetime = Field(sa_column=created_at_column())


class ResumeChunk(SQLModel, table=True):
    """One embeddable piece of a document."""

    __tablename__ = "resume_chunks"
    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "chunk_index",
            "model",
            name="resume_chunks_document_index_model_key",
        ),
    )

    id: UUID = Field(sa_column=uuid_pk())
    document_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("resume_documents.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    chunk_index: int = Field(sa_column=Column(Integer, nullable=False))
    # `skills`, `experience`, `education`, `projects`, `certifications`, `summary`
    # or `other`.
    section: str = Field(sa_column=Column(String(30), nullable=False, server_default="other"))
    text: str = Field(sa_column=Column(Text, nullable=False))
    approx_tokens: int = Field(sa_column=Column(Integer, nullable=False, server_default="0"))
    model: str = Field(sa_column=Column(String(150), nullable=False))
    embedding: list[float] | None = Field(sa_column=Column(Vector(EMBEDDING_DIM), nullable=True))


class ExtractionReview(SQLModel, table=True):
    """A document the pipeline could not read well enough to trust."""

    __tablename__ = "extraction_review"

    id: UUID = Field(sa_column=uuid_pk())
    document_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            ForeignKey("resume_documents.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        )
    )
    application_id: UUID | None = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    )
    # Why the document needs a human: the quality report's issues.
    reason: str = Field(sa_column=Column(Text, nullable=False))
    status: str = Field(sa_column=Column(String(20), nullable=False, server_default=REVIEW_OPEN))
    created_at: datetime = Field(sa_column=created_at_column())
    resolved_at: datetime | None = Field(sa_column=Column(created_at_column().type, nullable=True))
