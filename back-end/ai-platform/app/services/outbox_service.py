"""Writes the AI service's outbound events into its own outbox."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.outbox import OutboxEvent

PENDING = "PENDING"


class OutboxService:
    """Enqueues events for the relay to publish."""

    async def enqueue(
        self,
        session: AsyncSession,
        *,
        aggregate_type: str,
        aggregate_id: UUID,
        event_type: str,
        routing_key: str,
        payload: dict[str, Any],
    ) -> OutboxEvent:
        """Adds an event to the outbox.

        The caller commits: the event must land in the same transaction as the
        state change it describes.
        """
        event_id = uuid4()
        now = datetime.now(UTC)

        event = OutboxEvent(
            id=event_id,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            event_type=event_type,
            routing_key=routing_key,
            payload={
                "eventId": str(event_id),
                "eventType": event_type,
                "occurredAt": now.isoformat(),
                **payload,
            },
            status=PENDING,
            attempts=0,
            last_error=None,
            next_attempt_at=now,
            published_at=None,
            created_at=now,
        )
        session.add(event)
        return event
