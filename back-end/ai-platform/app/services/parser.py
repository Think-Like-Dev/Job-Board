"""PDF/DOCX text extraction. Blocking libraries run in a worker thread."""

from __future__ import annotations

import asyncio
import io
import zipfile
from dataclasses import dataclass
from pathlib import Path

import pymupdf
from docx import Document

from app.core.exceptions import (
    DocumentTooLarge,
    UnreadableDocument,
    UnsupportedFileType,
)

_SUPPORTED_SUFFIXES = {".pdf", ".docx"}
# A DOCX is a ZIP: the compressed upload cap does not bound the decompressed XML.
_MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024


@dataclass(frozen=True)
class ParsedDocument:
    text: str
    page_count: int


class DocumentParser:
    def __init__(self, max_bytes: int) -> None:
        self._max_bytes = max_bytes

    async def extract(self, filename: str | None, content: bytes) -> ParsedDocument:
        if len(content) > self._max_bytes:
            raise DocumentTooLarge(
                f"Resume exceeds the {self._max_bytes // (1024 * 1024)} MB limit"
            )
        suffix = Path(filename or "").suffix.lower()
        if suffix == ".pdf":
            return await asyncio.to_thread(self._extract_pdf, content)
        if suffix == ".docx":
            return await asyncio.to_thread(self._extract_docx, content)
        supported = ", ".join(sorted(_SUPPORTED_SUFFIXES))
        raise UnsupportedFileType(f"Unsupported resume type; expected one of {supported}")

    @staticmethod
    def _extract_pdf(content: bytes) -> ParsedDocument:
        try:
            with pymupdf.open(stream=content, filetype="pdf") as document:
                text = "\n".join(page.get_text("text") for page in document)
                return ParsedDocument(text=text.strip(), page_count=document.page_count)
        except Exception as exc:
            raise UnreadableDocument("The PDF could not be read") from exc

    @staticmethod
    def _extract_docx(content: bytes) -> ParsedDocument:
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                uncompressed = sum(info.file_size for info in archive.infolist())
            if uncompressed > _MAX_DOCX_UNCOMPRESSED_BYTES:
                raise DocumentTooLarge("The DOCX expands beyond the allowed size")
            document = Document(io.BytesIO(content))
            text = "\n".join(paragraph.text for paragraph in document.paragraphs)
            return ParsedDocument(text=text.strip(), page_count=0)
        except DocumentTooLarge:
            raise
        except Exception as exc:
            raise UnreadableDocument("The DOCX could not be read") from exc
