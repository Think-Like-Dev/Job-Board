"""Checks a file before anything tries to read it.

Nothing is trusted here: the extension says what the file claims to be, the
content says what it actually is. A file that lies is rejected rather than
half-parsed.
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pymupdf
from docx import Document

from app.core.exceptions import DocumentTooLarge, UnreadableDocument, UnsupportedFileType
from app.services.document.schemas import DocumentInfo

PDF_SUFFIX = ".pdf"
DOCX_SUFFIX = ".docx"
SUPPORTED_SUFFIXES = (PDF_SUFFIX, DOCX_SUFFIX)


def validate_document(
    filename: str | None,
    content: bytes,
    *,
    max_bytes: int,
) -> DocumentInfo:
    """Validates the file and returns what it is.

    Raises `DocumentTooLarge`, `UnsupportedFileType` or `UnreadableDocument`
    rather than returning a partially usable document.
    """
    if not content:
        raise UnreadableDocument("The document is empty")

    if len(content) > max_bytes:
        raise DocumentTooLarge(
            f"The document is larger than the {max_bytes // (1024 * 1024)} MB limit"
        )

    suffix = Path(filename or "").suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        supported = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise UnsupportedFileType(f"Unsupported document type; expected one of {supported}")

    if suffix == PDF_SUFFIX:
        return DocumentInfo(
            filename=filename,
            suffix=suffix,
            size_bytes=len(content),
            page_count=_pdf_page_count(content),
        )

    return DocumentInfo(
        filename=filename,
        suffix=suffix,
        size_bytes=len(content),
        page_count=0,
    )


def _pdf_page_count(content: bytes) -> int:
    """The page count, which also proves the PDF can be opened."""
    try:
        with pymupdf.open(stream=content, filetype="pdf") as document:
            if document.page_count == 0:
                raise UnreadableDocument("The PDF has no pages")
            return document.page_count
    except UnreadableDocument:
        raise
    except Exception as exc:
        raise UnreadableDocument("The PDF could not be read") from exc


def check_docx_integrity(content: bytes) -> None:
    """Makes sure the DOCX is a readable archive.

    A DOCX is a ZIP: the compressed upload cap does not bound the
    decompressed XML, so both are checked.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            uncompressed = sum(info.file_size for info in archive.infolist())
            if uncompressed > _MAX_DOCX_UNCOMPRESSED_BYTES:
                raise DocumentTooLarge("The DOCX expands beyond the allowed size")
        Document(io.BytesIO(content))
    except DocumentTooLarge:
        raise
    except Exception as exc:
        raise UnreadableDocument("The DOCX could not be read") from exc


_MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
