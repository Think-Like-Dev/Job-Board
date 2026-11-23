"""The scoring consumer.

It reads `application.submitted` from RabbitMQ, downloads the resume from
object storage, runs the resume-scoring graph and announces the result.

Failure handling:
- a run that fails is published to the retry queue and the original message is
  acknowledged, until the attempt cap is reached;
- after the cap the message is rejected, which dead-letters it, and a
  `scoring.failed` event is queued so the recruiter sees why there is no
  score.
"""

from __future__ import annotations

import contextlib
import json
import logging
from typing import Any
from uuid import UUID

from aio_pika.abc import AbstractIncomingMessage
from pydantic import ValidationError
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings, get_settings
from app.core.constants import WEIGHTS_VERSION
from app.core.exceptions import ConfigurationError
from app.core.messaging import (
    APPLICATION_CANCELLED,
    APPLICATION_SUBMITTED,
    SCORING_COMPLETED,
    SCORING_FAILED,
    SCORING_MAX_ATTEMPTS,
)
from app.core.rabbitmq import RabbitMqManager
from app.core.security import CredentialCipher, get_cipher
from app.db.session import async_session_factory
from app.graphs.nodes import GraphDependencies
from app.graphs.resume_scoring_graph import build_resume_scoring_graph
from app.graphs.state import ScoringState
from app.schemas.messaging import ApplicationCancelledEvent, ApplicationSubmittedEvent
from app.services.embedding_service import EmbeddingService
from app.services.job_service import JobService
from app.services.orchestrator import LLMOrchestrator
from app.services.outbox_service import OutboxService
from app.services.scoring.models import DeterministicScore
from app.services.storage_client import StorageClient

logger = logging.getLogger(__name__)


def _has_narrative(qualitative: object | None) -> bool:
    """Whether the evaluation carries something a recruiter can read.

    Without a language model the evaluation exists but is empty, so the
    result is a number and nothing else.
    """
    if qualitative is None:
        return False

    return bool(
        getattr(qualitative, "fit_analysis", "")
        or getattr(qualitative, "strengths", None)
        or getattr(qualitative, "risks", None)
        or getattr(qualitative, "interview_questions", None)
    )


class _UnavailableCipher:
    """Stands in for the credential cipher when no key is configured.

    Without an encryption key there are no stored provider credentials, so the
    cipher is never used; if it is, the failure is explicit.
    """

    def decrypt(self, token: str):
        raise ConfigurationError("AI_ENCRYPTION_KEY is not configured")

    def encrypt(self, plaintext: str) -> str:
        raise ConfigurationError("AI_ENCRYPTION_KEY is not configured")


class ScoringWorker:
    """Consumes scoring requests and produces matches."""

    def __init__(
        self,
        manager: RabbitMqManager,
        *,
        settings: Settings | None = None,
        storage: StorageClient | None = None,
        outbox: OutboxService | None = None,
    ) -> None:
        self._manager = manager
        self._settings = settings or get_settings()
        self._storage = storage or StorageClient(self._settings)
        self._outbox = outbox or OutboxService()
        self._consumer_tag: str | None = None
        self._queue: Any = None

    async def start(self) -> None:
        """Subscribes to the scoring queue."""
        queue = await self._manager.get_scoring_queue()
        self._queue = queue
        self._consumer_tag = await queue.consume(self._handle)
        logger.info("Scoring worker listening on %s", queue.name)

    async def stop(self) -> None:
        """Stops consuming."""
        if self._consumer_tag is None or self._queue is None:
            return
        with contextlib.suppress(Exception):
            await self._queue.cancel(self._consumer_tag)
        self._consumer_tag = None
        self._queue = None

    async def _handle(self, message: AbstractIncomingMessage) -> None:
        try:
            body = json.loads(message.body)
        except json.JSONDecodeError, UnicodeDecodeError:
            logger.error("Discarding a scoring message that is not valid JSON")
            await message.reject(requeue=False)
            return

        routing_key = message.routing_key
        if routing_key == APPLICATION_CANCELLED:
            await self._handle_cancellation(body)
            await message.ack()
            return

        if routing_key != APPLICATION_SUBMITTED:
            await message.ack()
            return

        try:
            await self._handle_scoring(message, body)
        except Exception:
            # Anything unexpected dead-letters the message. Leaving it
            # unacknowledged would redeliver it in a hot loop forever.
            logger.exception("Unexpected failure while handling a scoring message")
            with contextlib.suppress(Exception):
                await message.reject(requeue=False)

    async def _handle_cancellation(self, body: dict[str, Any]) -> None:
        """Records that an application must not be scored any more."""
        try:
            event = ApplicationCancelledEvent.model_validate(body)
        except ValidationError as exc:
            # A message that does not match the contract can never be handled:
            # dead-letter it instead of redelivering it forever.
            logger.error("Discarding a cancellation message that does not match: %s", exc)
            return
        async with async_session_factory() as session:
            await session.execute(
                text(
                    """
                    INSERT INTO cancelled_applications (application_id, reason, created_at)
                    VALUES (:application_id, :reason, now())
                    ON CONFLICT (application_id) DO NOTHING
                    """
                ).bindparams(application_id=event.applicationId, reason=event.reason or None)
            )
            await session.commit()
        logger.info("Application %s cancelled (%s)", event.applicationId, event.reason)

    async def _handle_scoring(self, message: AbstractIncomingMessage, body: dict[str, Any]) -> None:
        try:
            event = ApplicationSubmittedEvent.model_validate(body)
        except ValidationError as exc:
            # A message that does not match the contract can never be handled:
            # dead-letter it instead of redelivering it forever.
            logger.error("Discarding a scoring message that does not match: %s", exc)
            await message.reject(requeue=False)
            return

        attempt = int(message.headers.get("x-attempt", 1) or 1)

        async with async_session_factory() as session:
            if await self._is_cancelled(session, event.applicationId):
                logger.info("Skipping cancelled application %s", event.applicationId)
                await message.ack()
                return

            try:
                result = await self._score(session, event)
            except Exception as exc:
                logger.exception("Scoring failed for application %s", event.applicationId)
                requeued = await self._handle_failure(session, event, attempt, exc)
                if requeued:
                    await message.ack()
                else:
                    # Nothing left to try: dead-letter the message so it can be
                    # inspected in the dead-letter queue.
                    await message.reject(requeue=False)
                return

            await self._announce(session, event, result)

        await message.ack()

    async def _score(self, session: AsyncSession, event: ApplicationSubmittedEvent):
        """Downloads the resume and runs the scoring graph."""
        resume_bytes = await self._storage.read(event.resume.storageKey)

        cipher = self._build_cipher()
        orchestrator = LLMOrchestrator(session, cipher, self._settings)
        embedder = EmbeddingService(session, cipher, self._settings)
        job_service = JobService(session, orchestrator, self._settings)

        deps = GraphDependencies(
            session=session,
            orchestrator=orchestrator,
            embedder=embedder,
            job_service=job_service,
            settings=self._settings,
        )
        graph = build_resume_scoring_graph(deps)

        state = ScoringState(
            application_id=event.applicationId,
            candidate_id=event.candidateId,
            job_id=event.jobId,
            resume_file_id=event.resume.fileId,
            resume_filename=event.resume.filename,
            resume_bytes=resume_bytes,
            job_title=event.jobTitle,
            job_description_text=event.jobDescriptionText,
            job_skills=list(event.jobSkills),
            job_years_of_experience=event.jobYearsOfExperience,
            output_language=event.outputLanguage or "en",
            profile_snapshot=event.profileSnapshot or None,
            # Whether a language model is available decides how much of the
            # pipeline can run; without one the run still produces a score.
            llm_available=await orchestrator.has_active_provider(),
        )

        return await graph.ainvoke(state)

    async def _announce(
        self,
        session: AsyncSession,
        event: ApplicationSubmittedEvent,
        result: dict[str, Any],
    ) -> None:
        """Queues the result for the core API."""
        if await self._is_cancelled(session, event.applicationId):
            logger.info(
                "Not announcing application %s: it was cancelled while scoring",
                event.applicationId,
            )
            return

        deterministic: DeterministicScore | None = result.get("deterministic")
        qualitative = result.get("qualitative")
        match_id: UUID | None = result.get("match_id")

        if deterministic is None or match_id is None:
            # The document could not be read well enough to score, or the run
            # produced nothing. The recruiter sees why there is no score.
            reason = (
                "the document needs a manual review"
                if result.get("needs_review")
                else ("the scoring run produced no match")
            )
            code = "needs_review" if result.get("needs_review") else "scoring_failed"
            message = "; ".join(result.get("quality_issues") or []) or reason
            logger.warning("No score for application %s: %s", event.applicationId, message)

            await self._outbox.enqueue(
                session,
                aggregate_type="application",
                aggregate_id=event.applicationId,
                event_type=SCORING_FAILED,
                routing_key=SCORING_FAILED,
                payload={
                    "applicationId": str(event.applicationId),
                    "candidateId": str(event.candidateId),
                    "jobId": str(event.jobId),
                    "attempt": 1,
                    "reason": reason,
                    "code": code,
                    "message": message,
                },
            )
            await session.commit()
            return

        await self._outbox.enqueue(
            session,
            aggregate_type="application",
            aggregate_id=event.applicationId,
            event_type=SCORING_COMPLETED,
            routing_key=SCORING_COMPLETED,
            payload={
                "applicationId": str(event.applicationId),
                "candidateId": str(event.candidateId),
                "jobId": str(event.jobId),
                "matchId": str(match_id),
                "score": float(deterministic.score),
                "weightsVersion": WEIGHTS_VERSION,
                "componentScores": deterministic.components.model_dump(),
                "matchingSkills": list(deterministic.matching_skills),
                "missingSkills": list(deterministic.missing_skills),
                "aiSummary": (qualitative.fit_analysis if qualitative else "") or "",
                "strengths": list(qualitative.strengths if qualitative else []),
                "risks": list(qualitative.risks if qualitative else []),
                "interviewQuestions": list(qualitative.interview_questions if qualitative else []),
                "knockoutReason": deterministic.knockout_reason,
                # Without a language model there is no narrative, only the
                # deterministic score. The core API shows the two differently,
                # so the mode follows the content and not the mere existence
                # of the evaluation.
                "mode": "scored" if _has_narrative(qualitative) else "score_only",
            },
        )
        await session.commit()

    async def _handle_failure(
        self,
        session: AsyncSession,
        event: ApplicationSubmittedEvent,
        attempt: int,
        exc: Exception,
    ) -> bool:
        """Retries the run, or gives up and reports the failure.

        Returns True when the message was re-queued for another attempt.
        """
        message = f"{type(exc).__name__}: {exc}"[:2_000]

        if attempt < SCORING_MAX_ATTEMPTS:
            try:
                await self._manager.publish_retry(
                    {
                        "eventId": str(event.eventId),
                        "eventType": event.eventType,
                        "occurredAt": event.occurredAt.isoformat(),
                        "applicationId": str(event.applicationId),
                        "candidateId": str(event.candidateId),
                        "jobId": str(event.jobId),
                        "jobCode": event.jobCode,
                        "jobTitle": event.jobTitle,
                        "jobDescriptionText": event.jobDescriptionText,
                        "jobSkills": list(event.jobSkills),
                        "jobYearsOfExperience": event.jobYearsOfExperience,
                        "outputLanguage": event.outputLanguage,
                        "profileSnapshot": event.profileSnapshot,
                        "resume": event.resume.model_dump(mode="json"),
                    },
                    attempt + 1,
                )
            except Exception:
                logger.exception("Could not queue the retry; requeueing the message")
                await session.rollback()
                return False
            await session.rollback()
            return True

        await self._outbox.enqueue(
            session,
            aggregate_type="application",
            aggregate_id=event.applicationId,
            event_type=SCORING_FAILED,
            routing_key=SCORING_FAILED,
            payload={
                "applicationId": str(event.applicationId),
                "candidateId": str(event.candidateId),
                "jobId": str(event.jobId),
                "attempt": attempt,
                "reason": type(exc).__name__,
                "message": message,
            },
        )
        await session.commit()
        return False

    async def _is_cancelled(self, session: AsyncSession, application_id: UUID) -> bool:
        rows = await session.execute(
            text("SELECT 1 FROM cancelled_applications WHERE application_id = :id").bindparams(
                id=application_id
            )
        )
        return rows.first() is not None

    def _build_cipher(self) -> CredentialCipher | _UnavailableCipher:
        """The cipher for stored provider credentials, when one is configured."""
        try:
            return get_cipher()
        except ConfigurationError:
            return _UnavailableCipher()
