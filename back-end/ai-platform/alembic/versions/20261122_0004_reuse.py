"""reuse extracted resumes and their evaluation

Revision ID: 20261122_0004
Revises: 20261115_0003
Create Date: 2026-11-22

- `resume_analysis.canonical_text` keeps the deterministic plain-text rendering
  of the extracted JSON. Embeddings are computed from it, so a model swap
  re-embeds without a new extraction.
- `candidate_job_match.qualitative` keeps the whole evaluation, so a re-review
  reuses the narrative and the status instead of calling the model again.
- `resume_documents` becomes unique per `(application_id, sha256)`. Earlier
  re-reviews inserted one row per run; the oldest row is kept and the rest are
  removed (their chunks cascade).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261122_0004"
down_revision = "20261115_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "resume_analysis",
        sa.Column("canonical_text", sa.Text(), server_default=sa.text("''"), nullable=False),
    )
    op.add_column(
        "candidate_job_match",
        sa.Column(
            "qualitative",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
    )

    # Keep the first document of each application/hash pair before the unique
    # index is created. A null application_id is an ad-hoc evaluation and is
    # left alone.
    op.execute(
        """
        DELETE FROM resume_documents a
        USING resume_documents b
        WHERE a.application_id IS NOT NULL
          AND a.application_id = b.application_id
          AND a.sha256 = b.sha256
          AND (a.created_at > b.created_at
               OR (a.created_at = b.created_at AND a.id > b.id))
        """
    )
    op.create_index(
        "resume_documents_app_sha_key",
        "resume_documents",
        ["application_id", "sha256"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("resume_documents_app_sha_key", table_name="resume_documents")
    op.drop_column("candidate_job_match", "qualitative")
    op.drop_column("resume_analysis", "canonical_text")
