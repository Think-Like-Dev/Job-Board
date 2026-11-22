"""Reading-order analysis of a page.

A PDF stores text in the order it was drawn, not in the order a human reads
it. On a two-column CV the generator often draws the left column's first line,
then the right column's first line, and so on, so the plain text layer comes
out interleaved: half a sentence, then an unrelated bullet, then the rest.

The page is put back in order with an XY cut, the classic layout analysis: a
region is split along the widest empty band, first vertically (a gutter with
text on both sides - a column boundary) and otherwise horizontally (a band of
white space - the next section). The parts are then read in the order a person
reads them: columns left to right, bands top to bottom.

Nothing about the text is guessed: a cut only happens where no line of the
region crosses the band, and the text layer's order is kept for any page where
the geometry does not show a column break. This module never rewrites a page
it does not understand.
"""

from __future__ import annotations

from dataclasses import dataclass
from statistics import median

import pymupdf

# An empty band narrower than this is word spacing, not a layout boundary.
MIN_GAP = 6.0

# A vertical cut needs at least this many lines on each side: one line in the
# margin (a page number) is not a column.
MIN_SIDE_LINES = 2

# A column needs several lines, and each side must carry a real share of the
# region's text. A table row split into a title and a date has neither.
MIN_COLUMN_LINES = 4
MIN_COLUMN_SHARE = 0.15

# All the lines of one column start within this share of the page from each
# other. A wider spread means the "column" is several columns, or ragged text.
MAX_COLUMN_SPREAD = 0.20

# The two columns have to sit beside each other: if their vertical ranges do
# not overlap, the gap is just a wide space in a single column.
MIN_COLUMN_OVERLAP = 0.25

# The recursion stops here even if the cuts keep splitting; a CV does not have
# twenty levels of layout.
MAX_DEPTH = 24

# A vertical gap larger than this many line heights starts a new paragraph.
PARAGRAPH_GAP = 1.6


@dataclass(frozen=True)
class Line:
    """One line of text and where it was drawn."""

    text: str
    x0: float
    y0: float
    x1: float
    y1: float

    @property
    def height(self) -> float:
        return self.y1 - self.y0


def read_in_reading_order(page: pymupdf.Page) -> tuple[str | None, bool]:
    """The page's text in reading order, and whether the order can be trusted.

    The first value is `None` when there is nothing to fix: the caller keeps the
    text layer exactly as it is, so single-column documents are untouched. The
    second value is `False` when the page looks like it has columns but no cut
    could separate them; the caller then reports the order as untrustworthy
    instead of pretending the text layer is fine.
    """
    lines = _lines(page)
    if len(lines) < MIN_SIDE_LINES * 2:
        return None, True

    ordered, has_columns = _arrange(lines, depth=0, page_width=page.rect.width)
    if has_columns:
        return _join(ordered), True

    # A full-width line across the gutter blocks the XY cut. Split the page
    # into horizontal bands at those lines and arrange each band on its own.
    bands = _bands(lines, page.rect.width)
    if len(bands) > 1:
        arranged: list[Line] = []
        found_columns = False
        for band in bands:
            band_order, band_columns = _arrange(band, depth=0, page_width=page.rect.width)
            arranged.extend(band_order)
            found_columns = found_columns or band_columns
        if found_columns:
            return _join(arranged), True

    return None, not _looks_like_columns(lines, page.rect.width)


def _lines(page: pymupdf.Page) -> list[Line]:
    """The page's text lines, in the order the text layer returns them."""
    collected: list[Line] = []
    for block in page.get_text("dict")["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            text = "".join(span["text"] for span in line["spans"]).strip()
            if not text:
                continue
            x0, y0, x1, y1 = line["bbox"]
            collected.append(Line(text=text, x0=x0, y0=y0, x1=x1, y1=y1))
    return collected


def _bands(lines: list[Line], page_width: float) -> list[list[Line]]:
    """Splits a page into horizontal bands at lines that cross the middle.

    A section heading drawn across the gutter (`EXPERIENCE SKILLS`) covers the
    empty band the XY cut needs, so the body below it is never split. Treating
    the crossing line as its own band lets the body below be arranged.
    """
    middle = page_width / 2
    margin = page_width * 0.15
    bands: list[list[Line]] = []
    current: list[Line] = []

    for line in sorted(lines, key=lambda item: (item.y0, item.x0)):
        crosses = line.x0 < middle - margin and line.x1 > middle + margin
        if crosses:
            if current:
                bands.append(current)
                current = []
            bands.append([line])
        else:
            current.append(line)

    if current:
        bands.append(current)
    return bands


def _looks_like_columns(lines: list[Line], page_width: float) -> bool:
    """Whether the page has two vertical groups even if no clean cut exists."""
    middle = page_width / 2
    left = [line for line in lines if line.x0 < middle]
    right = [line for line in lines if line.x0 >= middle]
    if len(left) < MIN_COLUMN_LINES or len(right) < MIN_COLUMN_LINES:
        return False

    total = sum(len(line.text) for line in lines)
    if total == 0:
        return False
    left_share = sum(len(line.text) for line in left) / total
    right_share = sum(len(line.text) for line in right) / total
    if left_share < MIN_COLUMN_SHARE or right_share < MIN_COLUMN_SHARE:
        return False

    if not _starts_in_one_band(left, page_width) or not _starts_in_one_band(right, page_width):
        return False

    return _overlaps(left, right)


def _arrange(lines: list[Line], depth: int, page_width: float) -> tuple[list[Line], bool]:
    """Orders a region of the page and says whether it contained columns."""
    if len(lines) <= 1 or depth >= MAX_DEPTH:
        return lines, False

    split = _widest_gap(lines, horizontal=False)
    if split is not None:
        left = [line for line in lines if line.x1 <= split]
        right = [line for line in lines if line.x0 >= split]
        if _is_column_break(left, right, lines, page_width):
            left_order, _ = _arrange(left, depth + 1, page_width)
            right_order, _ = _arrange(right, depth + 1, page_width)
            return left_order + right_order, True

    split = _widest_gap(lines, horizontal=True)
    if split is None:
        return lines, False

    top = [line for line in lines if line.y1 <= split]
    bottom = [line for line in lines if line.y0 >= split]
    if not top or not bottom:
        return lines, False

    top_order, top_columns = _arrange(top, depth + 1, page_width)
    bottom_order, bottom_columns = _arrange(bottom, depth + 1, page_width)
    return top_order + bottom_order, top_columns or bottom_columns


def _is_column_break(
    left: list[Line],
    right: list[Line],
    region: list[Line],
    page_width: float,
) -> bool:
    """Whether a vertical gap really separates two columns.

    A gap that only splits a table row - titles on the left, dates on the
    right - is not a column: both sides are short and they sit on the same
    rows. A column break needs a few lines on each side, a real share of the
    text, and the two sides running beside each other.
    """
    if len(left) < MIN_COLUMN_LINES or len(right) < MIN_COLUMN_LINES:
        return False

    if not _starts_in_one_band(left, page_width) or not _starts_in_one_band(right, page_width):
        return False

    total = sum(len(line.text) for line in region)
    if total == 0:
        return False

    left_share = sum(len(line.text) for line in left) / total
    right_share = sum(len(line.text) for line in right) / total
    if left_share < MIN_COLUMN_SHARE or right_share < MIN_COLUMN_SHARE:
        return False

    return _overlaps(left, right)


def _starts_in_one_band(lines: list[Line], page_width: float) -> bool:
    """Whether every line of a column starts at roughly the same left edge."""
    edges = [line.x0 for line in lines]
    return max(edges) - min(edges) <= page_width * MAX_COLUMN_SPREAD


def _overlaps(left: list[Line], right: list[Line]) -> bool:
    """Whether the two columns run beside each other rather than in sequence."""
    top = max(min(line.y0 for line in left), min(line.y0 for line in right))
    bottom = min(max(line.y1 for line in left), max(line.y1 for line in right))
    if bottom <= top:
        return False

    shortest = min(
        max(line.y1 for line in left) - min(line.y0 for line in left),
        max(line.y1 for line in right) - min(line.y0 for line in right),
    )
    return shortest > 0 and (bottom - top) / shortest >= MIN_COLUMN_OVERLAP


def _widest_gap(lines: list[Line], horizontal: bool) -> float | None:
    """The middle of the widest empty band across the region.

    `horizontal=False` looks for a vertical band (an x interval no line
    covers) - a column gutter. `horizontal=True` looks for a horizontal band
    (a y interval no line covers) - white space between sections.
    """
    intervals = sorted(
        (line.x0, line.x1) if not horizontal else (line.y0, line.y1) for line in lines
    )

    widest: float | None = None
    width = 0.0
    farthest = intervals[0][1]
    for start, end in intervals[1:]:
        gap = start - farthest
        if gap > width and gap >= MIN_GAP:
            width, widest = gap, farthest + gap / 2
        farthest = max(farthest, end)
    return widest


def _join(lines: list[Line]) -> str:
    """Joins the lines in reading order, keeping a blank line between sections."""
    if not lines:
        return ""

    heights = [line.height for line in lines if line.height > 0]
    gap = (median(heights) if heights else 12.0) * PARAGRAPH_GAP

    parts: list[str] = []
    previous: Line | None = None
    for line in lines:
        if previous is not None:
            # A jump back up the page is the start of the next column; a wide
            # vertical gap is the start of the next section.
            jumped = line.y0 < previous.y1 - gap
            spaced = line.y0 - previous.y1 > gap
            if jumped or spaced:
                parts.append("")
        parts.append(line.text)
        previous = line
    return "\n".join(parts).strip()
