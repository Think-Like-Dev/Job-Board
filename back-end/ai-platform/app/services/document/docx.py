"""Reading a DOCX.

`python-docx` exposes paragraphs and tables, but not the order they appear
in. A CV that puts education in a table would otherwise come out with the
table either missing or appended at the end, so the document body is walked
in order.
"""

from __future__ import annotations

import io
import logging

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

from app.core.exceptions import UnreadableDocument
from app.services.document.schemas import ExtractedDocument, PageContent

logger = logging.getLogger(__name__)

# A DOCX has no pages; it is treated as a single block.
_BLOCK_SEPARATOR = "\n\n"


def extract_docx(content: bytes, filename: str | None) -> ExtractedDocument:
    """Reads the paragraphs and tables of a DOCX, in document order."""
    try:
        document = Document(io.BytesIO(content))
    except Exception as exc:
        raise UnreadableDocument("The DOCX could not be read") from exc

    blocks: list[str] = []
    tables = 0

    for element in document.element.body:
        tag = element.tag.split("}")[-1]
        if tag == "p":
            text = Paragraph(element, document).text.strip()
            if text:
                blocks.append(text)
        elif tag == "tbl":
            table = Table(element, document)
            rendered = _render_table(table)
            if rendered:
                blocks.append(rendered)
                tables += 1

    text = _BLOCK_SEPARATOR.join(blocks)

    pages = (PageContent(number=1, text=text, method="text"),) if text else ()

    logger.info("Read a DOCX with %s block(s) and %s table(s)", len(blocks), tables)

    return ExtractedDocument(
        filename=filename,
        suffix=".docx",
        text=text,
        pages=pages,
        page_count=1 if text else 0,
        method="text",
    )


def _render_table(table: Table) -> str:
    """Renders a table as markdown rows."""
    rows: list[str] = []
    for row in table.rows:
        cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
        if any(cells):
            rows.append("| " + " | ".join(cells) + " |")
    if not rows:
        return ""
    header = rows[0]
    separator = "| " + " | ".join("---" for _ in header.split("|")[1:-1]) + " |"
    return "\n".join([header, separator, *rows[1:]])
