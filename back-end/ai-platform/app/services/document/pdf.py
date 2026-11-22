"""Reading a PDF page by page.

A PDF is not one kind of document: page 1 can be selectable text, page 2 a
scan, page 3 two columns. So every page is classified on its own and read the
way that page needs.

Text pages are read in column order when the page shows a column break, and in
the text layer's own order otherwise. Image-only pages go through Tesseract.
A page the extractor does not understand is left exactly as the text layer
returned it, so the quality checks judge what was actually read.
"""

from __future__ import annotations

import io
import logging

import pymupdf
from PIL import Image

from app.core.config import Settings
from app.services.document.layout import read_in_reading_order
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

    text = "\n\n".join(page.text for page in pages if page.text)
    method = _overall_method(pages)

    return ExtractedDocument(
        filename=filename,
        suffix=".pdf",
        text=text,
        pages=tuple(pages),
        page_count=page_count,
        method=method,
    )


def _read_pages(content: bytes, settings: Settings) -> tuple[list[PageContent], int]:
    """Classifies each page, reads the ones that need OCR and orders the text."""
    pages: list[PageContent] = []

    with pymupdf.open(stream=content, filetype="pdf") as document:
        for index, page in enumerate(document):
            number = index + 1
            text = page.get_text("text").strip()

            if len(text) >= settings.ocr_page_char_threshold:
                text = read_in_reading_order(page) or text
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
