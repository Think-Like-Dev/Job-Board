"""Value objects shared by the document pipeline.

The pipeline is deliberately split into small steps so that each one can be
checked on its own:

    validate -> extract (per page) -> assess quality -> normalise -> chunk

Everything here is immutable: a document moves through the pipeline as a
sequence of new values, so a step can never mutate what an earlier step
produced.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class DocumentInfo:
    """What a file turned out to be."""

    filename: str | None
    suffix: str
    size_bytes: int
    page_count: int = 0


@dataclass(frozen=True)
class PageContent:
    """One page of a document and how its text was obtained."""

    number: int
    text: str
    #: `text` (selectable), `ocr` (read from an image) or `empty`.
    method: str = "text"
    #: False when the page looks like it has columns that could not be separated.
    reading_order_ok: bool = True
    #: Mean word confidence of the OCR pass, when the page was read as an image.
    ocr_confidence: float | None = None


@dataclass(frozen=True)
class ExtractedDocument:
    """The result of reading a document."""

    filename: str | None
    suffix: str
    text: str
    pages: tuple[PageContent, ...] = ()
    page_count: int = 0
    #: `text`, `hybrid` (some pages OCR'd) or `ocr` (every page OCR'd).
    method: str = "text"
    language: str | None = None


@dataclass(frozen=True)
class QualityReport:
    """What the extraction produced, and what looks wrong with it.

    The point is to never mark a document as processed just because a function
    returned a string: an unreadable page or a mangled reading order has to
    surface, not disappear.
    """

    ok: bool = True
    #: Characters per page. Near zero means the extraction failed.
    text_density: float = 0.0
    #: Share of pages that produced any text.
    page_coverage: float = 0.0
    #: False when the text contains replacement characters or control noise.
    unicode_ok: bool = True
    #: False when the text looks like two columns were interleaved.
    reading_order_ok: bool = True
    #: Lowest OCR confidence seen, when any page was OCR'd.
    min_ocr_confidence: float | None = None
    language: str | None = None
    issues: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class Chunk:
    """A piece of a document small enough to embed."""

    index: int
    text: str
    #: `skills`, `experience`, `education`, `projects`, `certifications`, `summary`
    #: or `other`.
    section: str = "other"
    #: Approximate token count (characters divided by four).
    approx_tokens: int = 0
