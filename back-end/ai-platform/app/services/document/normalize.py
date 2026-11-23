"""Normalising the extracted text and working out which language it is.

The text keeps its original language: a Tamil resume stays Tamil. Only the
characters are normalised (full-width forms, stray control characters,
ragged line endings) so that the same document always produces the same
embedding.
"""

from __future__ import annotations

import re
import unicodedata

# Control characters that carry no meaning for a document.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
# Three or more blank lines in a row.
_EXCESS_BLANK_LINES = re.compile(r"\n{3,}")
# Trailing spaces on a line.
_TRAILING_SPACE = re.compile(r"[ \t]+$", re.MULTILINE)

# Below this many characters the language guess is noise.
_MIN_CHARS_FOR_LANGUAGE = 40


def normalize_text(text: str) -> str:
    """Normalises the text without changing its language."""
    if not text:
        return ""

    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
    normalized = _CONTROL_CHARS.sub("", normalized)
    normalized = _TRAILING_SPACE.sub("", normalized)
    normalized = _EXCESS_BLANK_LINES.sub("\n\n", normalized)
    return normalized.strip()


def detect_language(text: str) -> str | None:
    """The language of the text, when it is long enough to tell.

    Returns an ISO 639-1 code, or None when the guess is not worth making.
    """
    if len(text.strip()) < _MIN_CHARS_FOR_LANGUAGE:
        return None

    try:
        from langdetect import DetectorFactory, detect_langs
        from langdetect.lang_detect_exception import LangDetectException
    except ImportError:  # pragma: no cover - the dependency is declared
        return None

    # Deterministic results: the same text must always give the same answer.
    DetectorFactory.seed = 0

    try:
        candidates = detect_langs(text)
    except LangDetectException:
        return None

    if not candidates:
        return None

    best = candidates[0]
    if best.prob < 0.6:
        return None
    return best.lang
