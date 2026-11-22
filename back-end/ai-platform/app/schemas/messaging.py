"""Typed payloads for the events that cross the service boundary.

The field names here are the contract with the core API
(`back-end/platform-api/src/modules/messaging/`). Change one side and change
the other in the same commit.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class EventEnvelope(BaseModel):
    """Fields every message carries."""

    eventId: UUID
    eventType: str
    occurredAt: datetime


class ResumePointer(BaseModel):
    """Where the resume lives in object storage."""

    fileId: UUID
    storageKey: str
    filename: str | None = None
    mimeType: str | None = None


class ApplicationSubmittedEvent(EventEnvelope):
    """A candidate submitted an application and it should be scored."""

    eventType: str = "application.submitted"
    applicationId: UUID
    candidateId: UUID
    jobId: UUID
    jobCode: str = ""
    jobTitle: str = ""
    jobDescriptionText: str = ""
    # The recruiter's own skill list. It lets the service build a job spec
    # without a language model, so the pipeline still runs (degraded) when no
    # model is configured.
    jobSkills: list[str] = Field(default_factory=list)
    jobYearsOfExperience: str | None = None
    # The language the narrative (fit analysis, strengths, risks) is written in.
    outputLanguage: str = "en"
    profileSnapshot: dict[str, Any] = Field(default_factory=dict)
    resume: ResumePointer


class ApplicationCancelledEvent(EventEnvelope):
    """The application was withdrawn or rejected: stop working on it."""

    eventType: str = "application.cancelled"
    applicationId: UUID
    candidateId: UUID
    jobId: UUID
    reason: str = ""


class ScoringCompletedEvent(EventEnvelope):
    """The AI service finished scoring an application."""

    eventType: str = "scoring.completed"
    applicationId: UUID
    candidateId: UUID
    jobId: UUID
    matchId: UUID
    score: float
    weightsVersion: str = ""
    componentScores: dict[str, float] = Field(default_factory=dict)
    matchingSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    aiSummary: str = ""
    strengths: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    interviewQuestions: list[str] = Field(default_factory=list)
    knockoutReason: str | None = None
    # Whether the result carries a narrative ("scored") or only the number
    # ("score_only"). The core API needs this to tell the recruiter which of
    # the two it is looking at.
    mode: str = "scored"


class ScoringFailedEvent(EventEnvelope):
    """The AI service gave up scoring an application."""

    eventType: str = "scoring.failed"
    applicationId: UUID
    candidateId: UUID
    jobId: UUID
    attempt: int = 1
    reason: str = ""
    # "needs_review" when the quality gate blocked scoring (the recruiter can
    # ask for a better file), "scoring_failed" otherwise.
    code: str = "scoring_failed"
    message: str = ""
