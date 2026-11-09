"""Deterministic scoring primitives. No LLM or database access here."""

from app.core.constants import WEIGHTS_VERSION
from app.services.scoring.engine import WEIGHTS, score_candidate
from app.services.scoring.models import DeterministicScore

__all__ = ["WEIGHTS", "WEIGHTS_VERSION", "DeterministicScore", "score_candidate"]
