"""Judging whether an extraction can be trusted.

A document is not "processed" because a function returned a string. These
checks look for the ways extraction actually goes wrong: a page that produced
nothing, replacement characters where characters should be, two columns
interleaved into nonsense, an OCR pass that read noise.
"""

from __future__ import annotations

from app.services.document.ocr import MIN_USABLE_CONFIDENCE
from app.services.document.schemas import ExtractedDocument, QualityReport

# Characters per page below which the extraction is considered empty.
MIN_TEXT_DENSITY = 120.0

# Share of pages that must produce text.
MIN_PAGE_COVERAGE = 0.5

# The replacement character and the zero-width characters that show up when a
# font has no glyph for a character. Built with chr() on purpose: a literal
# zero-width character is invisible in the source, and an empty string would
# match every text.
_SUSPICIOUS_CHARS = (
    chr(0xFFFD),  # replacement character
    chr(0x200B),  # zero width space
    chr(0x200C),  # zero width non-joiner
    chr(0x200D),  # zero width joiner
)


def assess(document: ExtractedDocument, language: str | None = None) -> QualityReport:
    """Builds the quality report for an extracted document."""
    issues: list[str] = []

    page_count = max(document.page_count, len(document.pages), 1)
    text = document.text
    density = len(text.strip()) / page_count

    pages_with_text = sum(1 for page in document.pages if page.text.strip())
    coverage = pages_with_text / page_count if document.pages else (1.0 if text else 0.0)

    unicode_ok = not any(char in text for char in _SUSPICIOUS_CHARS)
    if not unicode_ok:
        issues.append("the text contains replacement characters")

    # A page that looks like it has columns but could not be separated is not
    # silently accepted: the text layer's order is interleaved and the
    # extraction must go to a human.
    reading_order_ok = all(page.reading_order_ok for page in document.pages)
    if not reading_order_ok:
        issues.append("the text may be out of reading order")
    confidences = [
        page.ocr_confidence for page in document.pages if page.ocr_confidence is not None
    ]
    min_confidence = min(confidences) if confidences else None
    if min_confidence is not None and min_confidence < MIN_USABLE_CONFIDENCE:
        issues.append(f"the OCR confidence is low ({min_confidence:.0f}%)")

    if density < MIN_TEXT_DENSITY:
        issues.append(f"the text is too sparse ({density:.0f} characters per page)")

    if coverage < MIN_PAGE_COVERAGE:
        issues.append(f"only {coverage:.0%} of the pages produced text")

    if not text.strip():
        issues.append("no text could be extracted at all")

    return QualityReport(
        ok=not issues,
        text_density=round(density, 2),
        page_coverage=round(coverage, 4),
        unicode_ok=unicode_ok,
        reading_order_ok=reading_order_ok,
        min_ocr_confidence=round(min_confidence, 2) if min_confidence is not None else None,
        language=language,
        issues=tuple(issues),
    )
