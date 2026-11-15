"""The document ingestion pipeline.

    validate -> extract -> assess -> normalise -> chunk

Every step is a separate, testable function and every step keeps the
original document intact: the raw text, the normalised text, the chunks and
the quality report are stored side by side, so a better extractor can be
dropped in later without asking anybody to upload their CV again.
"""

from __future__ import annotations

import logging

from app.core.config import Settings
from app.services.document.chunking import chunk_document
from app.services.document.docx import extract_docx
from app.services.document.normalize import detect_language, normalize_text
from app.services.document.pdf import extract_pdf
from app.services.document.quality import assess
from app.services.document.schemas import Chunk, DocumentInfo, ExtractedDocument, QualityReport
from app.services.document.validation import check_docx_integrity, validate_document

logger = logging.getLogger(__name__)

__all__ = [
    "Chunk",
    "DocumentInfo",
    "ExtractedDocument",
    "IngestedDocument",
    "QualityReport",
    "ingest_document",
]


class IngestedDocument:
    """A document after the whole pipeline has run."""

    __slots__ = ("chunks", "document", "info", "normalized_text", "quality", "raw_text")

    def __init__(
        self,
        info: DocumentInfo,
        raw_text: str,
        normalized_text: str,
        document: ExtractedDocument,
        quality: QualityReport,
        chunks: list[Chunk],
    ) -> None:
        self.info = info
        self.raw_text = raw_text
        self.normalized_text = normalized_text
        self.document = document
        self.quality = quality
        self.chunks = chunks


def ingest_document(
    filename: str | None,
    content: bytes,
    settings: Settings,
) -> IngestedDocument:
    """Runs the whole pipeline over one file."""
    info = validate_document(filename, content, max_bytes=settings.max_resume_bytes)

    if info.suffix == ".pdf":
        extracted = extract_pdf(content, filename, settings)
    else:
        check_docx_integrity(content)
        extracted = extract_docx(content, filename)

    normalized = normalize_text(extracted.text)
    language = detect_language(normalized)
    quality = assess(extracted, language)
    chunks = chunk_document(normalized)

    logger.info(
        "Ingested %s: %s page(s), %s chunk(s), method=%s, language=%s, ok=%s",
        filename or info.suffix,
        info.page_count,
        len(chunks),
        extracted.method,
        language,
        quality.ok,
    )

    return IngestedDocument(
        info=info,
        raw_text=extracted.text,
        normalized_text=normalized,
        document=extracted,
        quality=quality,
        chunks=chunks,
    )
