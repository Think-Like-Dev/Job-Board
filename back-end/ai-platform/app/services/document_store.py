"""Stores an ingested document, its chunks and any review entry.

Everything an extraction produced is kept: the text as it was extracted, the
normalised text, the language, the quality report and the chunks with their
embeddings. That way a better extractor can be dropped in later without
asking anybody to upload their CV again.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import asdict
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.documents import (
    REVIEW_OPEN,
    STATUS_ACCEPTED,
    STATUS_NEEDS_REVIEW,
    ExtractionReview,
    ResumeChunk,
    ResumeDocument,
)
from app.services.document import IngestedDocument
from app.services.document.schemas import Chunk
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class DocumentStore:
    """Writes the result of the ingestion pipeline to the database."""

    def __init__(self, embedder: EmbeddingService) -> None:
        self._embedder = embedder

    async def store(
        self,
        session: AsyncSession,
        ingested: IngestedDocument,
        *,
        application_id: UUID | None = None,
        resume_file_id: UUID | None = None,
        sha256: str | None = None,
    ) -> ResumeDocument:
        """Stores the document, its chunks and, when needed, a review entry."""
        digest = sha256 or hashlib.sha256(ingested.raw_text.encode("utf-8")).hexdigest()
        quality = asdict(ingested.quality)
        needs_review = not ingested.quality.ok

        existing = await self._find(session, application_id, digest)
        if existing is not None:
            logger.info(
                "Reusing document %s for application %s (%s)",
                existing.id,
                application_id,
                digest[:12],
            )
            return existing

        document = ResumeDocument(
            resume_file_id=resume_file_id,
            application_id=application_id,
            sha256=digest,
            filename=ingested.info.filename,
            suffix=ingested.info.suffix,
            raw_text=ingested.raw_text,
            normalized_text=ingested.raw_text,
            language=ingested.quality.language,
            method=ingested.document.method,
            page_count=ingested.info.page_count,
            quality=quality,
            status=STATUS_NEEDS_REVIEW if needs_review else STATUS_ACCEPTED,
        )
        try:
            session.add(document)
            await session.flush()
        except IntegrityError:
            # A concurrent worker stored the same file first.
            await session.rollback()
            existing = await self._find(session, application_id, digest)
            if existing is None:
                raise
            return existing

        await self._store_chunks(session, document, ingested.chunks)

        if needs_review:
            await self._open_review(session, document, application_id)

        logger.info(
            "Stored document %s (%s chunk(s), status=%s)",
            document.id,
            len(ingested.chunks),
            document.status,
        )
        return document

    async def _find(
        self,
        session: AsyncSession,
        application_id: UUID | None,
        digest: str,
    ) -> ResumeDocument | None:
        """The document already stored for this application and file hash."""
        if application_id is None:
            return None
        return (
            await session.exec(
                select(ResumeDocument).where(
                    ResumeDocument.application_id == application_id,
                    ResumeDocument.sha256 == digest,
                )
            )
        ).first()

    async def _store_chunks(
        self,
        session: AsyncSession,
        document: ResumeDocument,
        chunks: list[Chunk],
    ) -> None:
        """Stores the chunks, with an embedding when one can be produced."""
        if not chunks:
            return

        model = self._embedder.model_name
        has_provider = await self._embedder.has_embedding_provider()

        for chunk in chunks:
            vector: list[float] | None = None
            if has_provider:
                try:
                    vector = await self._embedder.embed(chunk.text)
                except Exception as exc:
                    logger.warning("Could not embed a chunk: %s", exc)

            session.add(
                ResumeChunk(
                    document_id=document.id,
                    chunk_index=chunk.index,
                    section=chunk.section,
                    text=chunk.text,
                    approx_tokens=chunk.approx_tokens,
                    model=model,
                    embedding=vector,
                )
            )

    async def _open_review(
        self,
        session: AsyncSession,
        document: ResumeDocument,
        application_id: UUID | None,
    ) -> None:
        """Puts the document in the manual review queue."""
        reason = "; ".join(
            document.quality.get("issues", []) or ["the extraction was not reliable"]
        )
        existing = (
            await session.exec(
                select(ExtractionReview).where(
                    ExtractionReview.document_id == document.id,
                    ExtractionReview.status == REVIEW_OPEN,
                )
            )
        ).first()
        if existing is not None:
            return

        session.add(
            ExtractionReview(
                document_id=document.id,
                application_id=application_id,
                reason=reason,
                status=REVIEW_OPEN,
            )
        )
