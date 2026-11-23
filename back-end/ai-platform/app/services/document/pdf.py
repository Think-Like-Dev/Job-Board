"""Reading a PDF page by page.

A PDF is not one kind of document: page 1 can be selectable text, page 2 a
scan, page 3 two columns. So every page is classified on its own and read the
way that page needs.

Text pages go through PyMuPDF4LLM, which keeps the reading order and the
tables. Image-only pages go through Tesseract. A page that comes back from
the layout extractor empty falls back to the plain text layer.
"""

from __future__ import annotations

import io
import logging

import pymupdf
import pymupdf4llm
from PIL import Image

from app.core.config import Settings
from app.services.document.ocr import ocr_image
from app.services.document.schemas import ExtractedDocument, PageContent

logger = logging.getLogger(__name__)

# Resolution used when a page has to be rendered for OCR.
OCR_DPI = 200


def extract_pdf(
    content: bytes,
    filename: str | None,
    settings: Settings,
) -> ExtractedDocument:
    """Reads every page of the PDF and returns the assembled document."""
    pages, page_count = _read_pages(content, settings)
    layout = _read_layout(content)

    enriched: list[PageContent] = []
    for page in pages:
        if page.method == "text":
            markdown = layout.get(page.number)
            if markdown and len(markdown.strip()) > len(page.text.strip()):
                page = PageContent(
                    number=page.number,
                    text=markdown.strip(),
                    method="text",
                    ocr_confidence=page.ocr_confidence,
                )
        enriched.append(page)

    text = "\n\n".join(page.text for page in enriched if page.text)
    method = _overall_method(enriched)

    return ExtractedDocument(
        filename=filename,
        suffix=".pdf",
        text=text,
        pages=tuple(enriched),
        page_count=page_count,
        method=method,
    )


def _read_pages(content: bytes, settings: Settings) -> tuple[list[PageContent], int]:
    """Classifies each page and reads the ones that need OCR."""
    pages: list[PageContent] = []

    with pymupdf.open(stream=content, filetype="pdf") as document:
        for index, page in enumerate(document):
            number = index + 1
            text = page.get_text("text").strip()

            if len(text) >= settings.ocr_page_char_threshold:
                pages.append(PageContent(number=number, text=text, method="text"))
                continue

            ocr_text, confidence = _ocr_page(page, settings)
            pages.append(
                PageContent(
                    number=number,
                    text=ocr_text,
                    method="ocr" if ocr_text else "empty",
                    ocr_confidence=confidence if ocr_text else None,
                )
            )

        page_count = document.page_count

    return pages, page_count


def _ocr_page(page: pymupdf.Page, settings: Settings) -> tuple[str, float]:
    """Renders one page and reads it with Tesseract."""
    try:
        pixmap = page.get_pixmap(dpi=OCR_DPI)
        image = Image.open(io.BytesIO(pixmap.tobytes("png")))
    except Exception as exc:
        logger.warning("Could not render page %s for OCR: %s", page.number, exc)
        return "", 0.0

    return ocr_image(image, settings.ocr_languages)


def _read_layout(content: bytes) -> dict[int, str]:
    """The layout-aware markdown per page, when the extractor is available.

    The layout model is an extra download and an extra inference pass, so a
    failure here is not fatal: the plain text layer is used instead.
    """
    try:
        with pymupdf.open(stream=content, filetype="pdf") as document:
            chunks = pymupdf4llm.to_markdown(
                document,
                page_chunks=True,
                use_ocr=False,
                show_progress=False,
            )
    except Exception as exc:
        logger.warning("Layout extraction is unavailable, using the text layer: %s", exc)
        return {}

    pages: dict[int, str] = {}
    for index, chunk in enumerate(chunks or []):
        if isinstance(chunk, dict):
            text = str(chunk.get("text", ""))
            number = chunk.get("metadata", {}).get("page", index + 1)
        else:
            text = str(chunk)
            number = index + 1
        pages[int(number)] = text
    return pages


def _overall_method(pages: list[PageContent]) -> str:
    if not pages:
        return "empty"
    with_text = [page for page in pages if page.method == "text"]
    with_ocr = [page for page in pages if page.method == "ocr"]
    if not with_ocr and not with_text:
        return "empty"
    if not with_ocr:
        return "text"
    if not with_text:
        return "ocr"
    return "hybrid"
