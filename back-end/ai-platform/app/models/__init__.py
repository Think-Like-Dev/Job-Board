"""SQLModel tables persisted in the ``job_board_ai_ats`` database."""

from app.models.ats import (
    CandidateJobMatch,
    JobAnalysis,
    JobEmbedding,
    ResumeAnalysis,
    ResumeEmbedding,
)
from app.models.llm_config import (
    AICredential,
    AIModel,
    AIModelFailure,
    AIProvider,
)

__all__ = [
    "AICredential",
    "AIModel",
    "AIModelFailure",
    "AIProvider",
    "CandidateJobMatch",
    "JobAnalysis",
    "JobEmbedding",
    "ResumeAnalysis",
    "ResumeEmbedding",
]
