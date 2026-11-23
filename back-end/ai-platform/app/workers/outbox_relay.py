"""Publishes the AI service's outbound events.

The relay claims the pending rows with `FOR UPDATE SKIP LOCKED`, publishes
them to RabbitMQ with publisher confirms and defers a failure with a growing
delay. After the attempt cap the row stays in the table as `FAILED` so an
operator can see it instead of it disappearing.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.rabbitmq import RabbitMqManager
from app.db.session import async_session_factory

logger = logging.getLogger(__name__)

PENDING = "PENDING"
PUBLISHED = "PUBLISHED"
FAILED = "FAILED"

BATCH_SIZE = 50
POLL_SECONDS = 5.0
MAX_ATTEMPTS = 5
MAX_BACKOFF_SECONDS = 300


class OutboxRelay:
    """Polls the outbox and publishes what is pending."""

    def __init__(
        self,
        manager: RabbitMqManager,
        *,
        batch_size: int = BATCH_SIZE,
        poll_seconds: float = POLL_SECONDS,
        max_attempts: int = MAX_ATTEMPTS,
    ) -> None:
        self._manager = manager
        self._batch_size = batch_size
        self._poll_seconds = poll_seconds
        self._max_attempts = max_attempts
        self._task: asyncio.Task[None] | None = None
        self._running = False

    def start(self) -> None:
        """Starts the background poll."""
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._loop(), name="ai-outbox-relay")
        logger.info("AI outbox relay started (every %.1fs)", self._poll_seconds)

    async def stop(self) -> None:
        """Stops the background poll."""
        task = self._task
        self._task = None
        if task is None:
            return
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task

    async def _loop(self) -> None:
        while True:
            try:
                published = await self.publish_pending()
                if published:
                    logger.info("Published %s AI outbox event(s)", published)
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("AI outbox relay tick failed")
            await asyncio.sleep(self._poll_seconds)

    async def publish_pending(self) -> int:
        """Publishes one batch. Returns how many rows reached the broker."""
        published = 0

        async with async_session_factory() as session:
            rows = (
                await session.exec(
                    text(
                        """
                        SELECT id, routing_key, payload, attempts
                          FROM event_outbox
                         WHERE status = :status AND next_attempt_at <= now()
                         ORDER BY created_at
                         LIMIT :limit
                         FOR UPDATE SKIP LOCKED
                        """
                    ).bindparams(status=PENDING, limit=self._batch_size)
                )
            ).all()

            for row in rows:
                try:
                    await self._manager.publish(row.routing_key, row.payload)
                except Exception as exc:
                    await self._defer(session, row, exc)
                    continue

                await session.execute(
                    text(
                        """
                        UPDATE event_outbox
                           SET status = :published, published_at = now(), last_error = NULL
                         WHERE id = :id
                        """
                    ).bindparams(published=PUBLISHED, id=row.id)
                )
                published += 1

            if rows:
                await session.commit()

        return published

    async def _defer(self, session: AsyncSession, row, exc: Exception) -> None:
        attempts = int(row.attempts) + 1
        dead = attempts >= self._max_attempts
        delay = min(2**attempts, MAX_BACKOFF_SECONDS)
        message = f"{type(exc).__name__}: {exc}"[:2_000]

        await session.execute(
            text(
                """
                UPDATE event_outbox
                   SET attempts = :attempts,
                       status = :status,
                       last_error = :last_error,
                       next_attempt_at = :next_attempt_at
                 WHERE id = :id
                """
            ).bindparams(
                attempts=attempts,
                status=FAILED if dead else PENDING,
                last_error=message,
                next_attempt_at=datetime.now(UTC) + timedelta(seconds=delay),
                id=row.id,
            )
        )
        await session.commit()

        if dead:
            logger.error(
                "AI outbox event %s (%s) failed permanently after %s attempts: %s",
                row.id,
                row.routing_key,
                attempts,
                message,
            )
        else:
            logger.warning(
                "AI outbox event %s (%s) not published (attempt %s): %s",
                row.id,
                row.routing_key,
                attempts,
                message,
            )
