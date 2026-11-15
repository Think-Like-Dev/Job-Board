"""document ingestion tables

Revision ID: 20261115_0003
Revises: 20261115_0002
Create Date: 2026-11-15

`resume_documents` keeps an ingested resume: the text as it was extracted, the
normalised text, the language, how it was read and the quality report.

`resume_chunks` keeps the pieces the document was cut into, each with its own
embedding.

`extraction_review` is the manual review queue: documents the pipeline could
not read well enough to trust.

`job_analysis.source_text` keeps the job description as it was submitted, so a
job can be re-embedded later without asking the core API for it again.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision = "20261115_0003"
down_revision = "20261115_0002"
branch_labels = None
depends_on = None

EMBEDDING_DIM = 384


def upgrade() -> None:
    op.create_table(
        "resume_documents",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("resume_file_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("filename", sa.Text(), nullable=True),
        sa.Column("suffix", sa.String(length=10), nullable=False),
        sa.Column("raw_text", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("normalized_text", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("language", sa.String(length=10), nullable=True),
        sa.Column("method", sa.String(length=20), server_default=sa.text("'text'"), nullable=False),
        sa.Column("page_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "quality",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            server_default=sa.text("'accepted'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_resume_documents_resume_file_id",
        "resume_documents",
        ["resume_file_id"],
        unique=False,
    )
    op.create_index(
        "ix_resume_documents_application_id",
        "resume_documents",
        ["application_id"],
        unique=False,
    )
    op.create_index("ix_resume_documents_sha256", "resume_documents", ["sha256"], unique=False)

    op.create_table(
        "resume_chunks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column(
            "section", sa.String(length=30), server_default=sa.text("'other'"), nullable=False
        ),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("approx_tokens", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("model", sa.String(length=150), nullable=False),
        sa.Column("embedding", Vector(EMBEDDING_DIM), nullable=True),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["resume_documents.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id",
            "chunk_index",
            "model",
            name="resume_chunks_document_index_model_key",
        ),
    )
    op.create_index("ix_resume_chunks_document_id", "resume_chunks", ["document_id"], unique=False)

    op.create_table(
        "extraction_review",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default=sa.text("'open'"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["resume_documents.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_extraction_review_document_id",
        "extraction_review",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        "ix_extraction_review_application_id",
        "extraction_review",
        ["application_id"],
        unique=False,
    )

    op.add_column(
        "job_analysis",
        sa.Column("source_text", sa.Text(), server_default=sa.text("''"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("job_analysis", "source_text")
    op.drop_index("ix_extraction_review_application_id", table_name="extraction_review")
    op.drop_index("ix_extraction_review_document_id", table_name="extraction_review")
    op.drop_table("extraction_review")
    op.drop_index("ix_resume_chunks_document_id", table_name="resume_chunks")
    op.drop_table("resume_chunks")
    op.drop_index("ix_resume_documents_sha256", table_name="resume_documents")
    op.drop_index("ix_resume_documents_application_id", table_name="resume_documents")
    op.drop_index("ix_resume_documents_resume_file_id", table_name="resume_documents")
    op.drop_table("resume_documents")
