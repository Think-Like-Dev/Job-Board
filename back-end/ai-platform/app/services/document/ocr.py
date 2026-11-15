"""Reading scanned pages with Tesseract.

Only the language packs installed in the image are available — English for
now. A page that is read this way also carries the OCR confidence, which the
quality report uses to spot a page that was "read" but is really noise.
"""

from __future__ import annotations

import logging

import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

# Below this mean word confidence the page is treated as unusable rather than
# as text: a blurry scan produces confident-looking nonsense.
MIN_USABLE_CONFIDENCE = 40.0


def ocr_image(image: Image.Image, languages: str) -> tuple[str, float]:
    """Reads an image and returns its text plus the mean word confidence."""
    try:
        data = pytesseract.image_to_data(
            image,
            lang=languages,
            output_type=pytesseract.Output.DICT,
        )
    except pytesseract.TesseractError as exc:
        logger.warning("Tesseract could not read the page: %s", exc)
        return "", 0.0
    except (FileNotFoundError, OSError) as exc:
        # Tesseract is not installed in this image (it lives in the Docker
        # image, not on a developer machine).
        logger.warning("Tesseract is not available: %s", exc)
        return "", 0.0
    except Exception as exc:
        logger.warning("OCR failed for the page: %s", exc)
        return "", 0.0

    words: list[str] = []
    confidences: list[float] = []

    for text, confidence in zip(data.get("text", []), data.get("conf", []), strict=False):
        try:
            score = float(confidence)
        except TypeError, ValueError:
            continue
        if score < 0:
            # -1 means "no confidence for this box".
            continue
        cleaned = (text or "").strip()
        if not cleaned:
            continue
        words.append(cleaned)
        confidences.append(score)

    if not words:
        return "", 0.0

    return " ".join(words), sum(confidences) / len(confidences)


def tesseract_available() -> bool:
    """Whether the Tesseract binary can be reached."""
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        return False
    return True
