"""PDF/DOCX text extraction.

The extraction itself lives in `app/services/document/` — the same pipeline
the scoring worker uses, so a resume is read the same way whichever door it
comes through. This module is the small adapter the HTTP routes use.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from app.core.config import Settings
from app.services.document import ingest_document


@dataclass(frozen=True)
class ParsedDocument:
    text: str
    page_count: int


class DocumentParser:
    """Reads a document into text."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def extract(self, filename: str | None, content: bytes) -> ParsedDocument:
        """Returns the text of the document.

        The pipeline does the blocking work, so it runs in a worker thread.
        """
        ingested = await asyncio.to_thread(
            ingest_document,
            filename,
            content,
            self._settings,
        )
        return ParsedDocument(
            text=ingested.raw_text,
            page_count=ingested.info.page_count,
        )
