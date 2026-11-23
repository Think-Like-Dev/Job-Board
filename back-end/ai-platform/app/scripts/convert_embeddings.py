"""Re-embeds the stored vectors when the embedding model (or its size) changes.

A vector cannot be converted between models or sizes — it has to be computed
again from the text it came from. This script does that:

- every `resume_analysis` is re-embedded from its raw text;
- every `job_analysis` that belongs to a job is re-embedded from its summary.

Run it after changing `AI_LOCAL_EMBEDDING_MODEL` or `AI_EMBEDDING_DIM`, and
after the Alembic migration that changes the vector column type.

    uv run python -m app.scripts.convert_embeddings

The script is safe to re-run: it replaces the vectors it owns and leaves the
rest alone.
"""

from __future__ import annotations

import asyncio
import logging

from sqlmodel import delete, select

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError
from app.core.security import CredentialCipher, get_cipher
from app.db.session import async_session_factory
from app.models.ats import JobAnalysis, JobEmbedding, ResumeAnalysis, ResumeEmbedding
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class _UnavailableCipher:
    """Stands in for the credential cipher when no key is configured."""

    def decrypt(self, token: str):
        raise ConfigurationError("AI_ENCRYPTION_KEY is not configured")

    def encrypt(self, plaintext: str) -> str:
        raise ConfigurationError("AI_ENCRYPTION_KEY is not configured")


def _build_cipher() -> CredentialCipher | _UnavailableCipher:
    try:
        return get_cipher()
    except ConfigurationError:
        return _UnavailableCipher()


async def convert_resumes(session, embedder: EmbeddingService) -> int:
    """Re-embeds every stored resume."""
    analyses = (await session.exec(select(ResumeAnalysis))).all()
    converted = 0

    for analysis in analyses:
        text = (analysis.raw_text or analysis.summary or "").strip()
        if not text:
            logger.warning("Resume analysis %s has no text; skipped", analysis.id)
            continue

        vector = await embedder.embed(text)

        # Replace the vectors of this analysis whatever model produced them.
        await session.exec(
            delete(ResumeEmbedding).where(ResumeEmbedding.resume_analysis_id == analysis.id)
        )
        session.add(
            ResumeEmbedding(
                resume_analysis_id=analysis.id,
                embedding=vector,
                model=embedder.model_name,
            )
        )
        converted += 1

    return converted


async def convert_jobs(session, embedder: EmbeddingService) -> int:
    """Re-embeds every job analysis that belongs to a job."""
    analyses = (await session.exec(select(JobAnalysis))).all()
    converted = 0

    for analysis in analyses:
        if analysis.job_id is None:
            logger.warning("Job analysis %s has no job; skipped", analysis.id)
            continue

        text = (analysis.summary or "").strip()
        if not text:
            logger.warning("Job analysis %s has no text; skipped", analysis.id)
            continue

        vector = await embedder.embed(text)

        await session.exec(delete(JobEmbedding).where(JobEmbedding.job_id == analysis.job_id))
        session.add(
            JobEmbedding(
                job_id=analysis.job_id,
                embedding=vector,
                model=embedder.model_name,
            )
        )
        converted += 1

    return converted


async def main() -> int:
    logging.basicConfig(level=logging.INFO)
    settings = get_settings()
    logger.info(
        "Converting embeddings to %s (%s dimensions)",
        settings.local_embedding_model,
        settings.embedding_dim,
    )

    async with async_session_factory() as session:
        embedder = EmbeddingService(session, _build_cipher(), settings)

        if not await embedder.has_embedding_provider():
            logger.error(
                "No embedding provider is reachable. Start the embedding model "
                "server and check AI_EMBEDDING_BASE_URL / AI_LOCAL_EMBEDDING_MODEL."
            )
            return 1

        resumes = await convert_resumes(session, embedder)
        await session.commit()
        jobs = await convert_jobs(session, embedder)
        await session.commit()

        logger.info(
            "Converted %s resume vector(s) and %s job vector(s) to %s",
            resumes,
            jobs,
            embedder.model_name,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
