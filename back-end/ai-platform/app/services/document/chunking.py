"""Cutting a document into pieces small enough to embed.

The embedding model has a token limit, so a whole resume must never become
one vector. The document is first split into its sections (skills,
experience, education, ...) and then each section into chunks of a few
hundred tokens.
"""

from __future__ import annotations

import re

from app.services.document.schemas import Chunk

# A chunk is about 350 tokens; four characters per token is close enough for
# an approximation that decides how to cut.
CHARS_PER_TOKEN = 4
DEFAULT_MAX_CHARS = 1400
DEFAULT_OVERLAP_CHARS = 120

# Headings that are short enough to be a title.
MAX_HEADING_CHARS = 60

# Section names, in the languages the product is used in. A heading that is
# not in this list is still treated as a heading when it looks like one, and
# lands in `other` when it cannot be classified.
_SECTION_NAMES: dict[str, set[str]] = {
    "summary": {
        "summary",
        "profile",
        "objective",
        "about me",
        "about",
        "professional summary",
        "personal details",
        "personal information",
        "curriculum vitae",
        "cv",
    },
    "skills": {
        "skills",
        "technical skills",
        "core skills",
        "key skills",
        "competencies",
        "areas of expertise",
        "technologies",
        "tools",
    },
    "experience": {
        "experience",
        "work experience",
        "professional experience",
        "employment",
        "employment history",
        "career history",
        "work history",
        "internships",
    },
    "projects": {
        "projects",
        "personal projects",
        "selected projects",
        "academic projects",
        "key projects",
    },
    "education": {
        "education",
        "academic background",
        "academic qualifications",
        "qualifications",
        "education and training",
        "degrees",
    },
    "certifications": {
        "certifications",
        "certificates",
        "licenses",
        "licences",
        "courses",
        "training",
    },
}

_NAME_TO_SECTION = {name: section for section, names in _SECTION_NAMES.items() for name in names}

_HEADING_END = re.compile(r"[.!?,;:]$")


def chunk_document(
    text: str,
    *,
    max_chars: int = DEFAULT_MAX_CHARS,
    overlap_chars: int = DEFAULT_OVERLAP_CHARS,
) -> list[Chunk]:
    """Splits the text into sections and then into chunks."""
    if not text.strip():
        return []

    chunks: list[Chunk] = []
    index = 0

    for section, blocks in _sections(text):
        for body in _split_blocks(blocks, max_chars, overlap_chars):
            cleaned = body.strip()
            if not cleaned:
                continue
            chunks.append(
                Chunk(
                    index=index,
                    text=cleaned,
                    section=section,
                    approx_tokens=len(cleaned) // CHARS_PER_TOKEN,
                )
            )
            index += 1

    return chunks


def _sections(text: str) -> list[tuple[str, list[str]]]:
    """Groups the paragraphs of the text under the heading they belong to."""
    blocks = [block.strip() for block in text.split("\n\n") if block.strip()]

    sections: list[tuple[str, list[str]]] = []
    current_section = "other"
    current_blocks: list[str] = []

    for block in blocks:
        heading = _heading_section(block)
        if heading is not None:
            if current_blocks:
                sections.append((current_section, current_blocks))
            current_section = heading
            current_blocks = [block]
            continue
        current_blocks.append(block)

    if current_blocks:
        sections.append((current_section, current_blocks))

    return sections


def _heading_section(block: str) -> str | None:
    """The section a block introduces, or None when it is not a heading."""
    if "\n" in block:
        return None
    if len(block) > MAX_HEADING_CHARS:
        return None
    if _HEADING_END.search(block):
        return None

    # The layout extractor writes headings as markdown ("# Skills").
    title = block.strip().lstrip("#").strip()
    if not title or len(title) > MAX_HEADING_CHARS:
        return None

    lowered = title.lower().rstrip(":").strip()
    if lowered in _NAME_TO_SECTION:
        return _NAME_TO_SECTION[lowered]

    # A line that reads like a title ("Work Experience", "PROJECTS") starts a
    # new section even when the name is not in the list. A list of skills
    # ("Python, FastAPI, Postgres") also looks like a title, so a heading
    # never contains punctuation or digits.
    words = title.split()
    if (
        1 <= len(words) <= 4
        and not any(char in title for char in ",.;:()[]/+&")
        and not any(char.isdigit() for char in title)
        and all(word[:1].isupper() for word in words if word)
    ):
        return "other"

    return None


def _split_blocks(
    blocks: list[str],
    max_chars: int,
    overlap_chars: int,
) -> list[str]:
    """Cuts the blocks of one section into pieces of at most `max_chars`."""
    pieces: list[str] = []
    current = ""

    for block in blocks:
        if len(block) > max_chars:
            # A single block longer than the limit (a long paragraph, a wide
            # table) is cut on line boundaries.
            if current:
                pieces.append(current)
                current = ""
            pieces.extend(_split_long_block(block, max_chars, overlap_chars))
            continue

        candidate = f"{current}\n\n{block}" if current else block
        if len(candidate) > max_chars:
            pieces.append(current)
            current = block[-overlap_chars:] if overlap_chars else ""
            current = f"{current}\n\n{block}" if current else block
        else:
            current = candidate

    if current:
        pieces.append(current)

    return pieces


def _split_long_block(block: str, max_chars: int, overlap_chars: int) -> list[str]:
    """Cuts one oversized block on line boundaries."""
    pieces: list[str] = []
    current = ""

    for line in block.splitlines():
        if current and len(current) + len(line) + 1 > max_chars:
            pieces.append(current)
            tail = current[-overlap_chars:] if overlap_chars else ""
            current = f"{tail}\n{line}" if tail else line
        else:
            current = f"{current}\n{line}" if current else line

    if current.strip():
        pieces.append(current)

    return pieces
