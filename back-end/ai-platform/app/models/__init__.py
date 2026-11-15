"""SQLModel tables persisted in the ``job_board_ai_ats`` database."""

from app.models.ats import (
    CandidateJobMatch,
    JobAnalysis,
    JobEmbedding,
    ResumeAnalysis,
    ResumeEmbedding,
)
from app.models.cancellation import CancelledApplication
from app.models.documents import ExtractionReview, ResumeChunk, ResumeDocument
from app.models.llm_config import (
    AICredential,
    AIModel,
    AIModelFailure,
    AIProvider,
)
from app.models.outbox import OutboxEvent

__all__ = [
    "AICredential",
    "AIModel",
    "AIModelFailure",
    "AIProvider",
    "CancelledApplication",
    "CandidateJobMatch",
    "ExtractionReview",
    "JobAnalysis",
    "JobEmbedding",
    "OutboxEvent",
    "ResumeAnalysis",
    "ResumeChunk",
    "ResumeDocument",
    "ResumeEmbedding",
]
