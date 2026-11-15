"""RabbitMQ connection, topology and publishing for the AI service.

Everything the service needs to talk to the broker lives here: the connection
manager, the topology declaration (so the queues exist with the right dead
letter wiring) and a small publish helper.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import aio_pika
from aio_pika import DeliveryMode, ExchangeType, Message
from aio_pika.abc import AbstractChannel, AbstractExchange, AbstractQueue

from app.core.config import Settings, get_settings
from app.core.messaging import (
    AI_SCORING_QUEUE,
    AI_SCORING_RETRY_QUEUE,
    APPLICATION_SUBMITTED,
    APPLICATION_SUBMITTED_RETRY,
    DEAD_LETTER_EXCHANGE,
    DEAD_LETTER_QUEUE,
    EVENTS_EXCHANGE,
    SCORING_RETRY_DELAY_MS,
)

logger = logging.getLogger(__name__)


class RabbitMqManager:
    """Owns the broker connection, the topology and the publish helper.

    The topology is declared by this service for the queues it consumes and
    for the exchange both services publish to. Declarations are idempotent, so
    the core API declaring the same names is harmless.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: AbstractChannel | None = None
        self._exchange: AbstractExchange | None = None

    @property
    def exchange(self) -> AbstractExchange:
        if self._exchange is None:
            raise RuntimeError("RabbitMQ is not connected")
        return self._exchange

    async def connect(self) -> None:
        """Opens the connection and declares the topology."""
        if self._connection is not None and not self._connection.is_closed:
            return

        self._connection = await aio_pika.connect_robust(self._settings.rabbitmq_url)
        self._channel = await self._connection.channel()
        await self._channel.set_qos(prefetch_count=1)

        self._exchange = await self._channel.declare_exchange(
            EVENTS_EXCHANGE,
            ExchangeType.TOPIC,
            durable=True,
        )
        dead_letter = await self._channel.declare_exchange(
            DEAD_LETTER_EXCHANGE,
            ExchangeType.TOPIC,
            durable=True,
        )

        # Messages that nobody could process end up here.
        dead_letter_queue = await self._channel.declare_queue(
            DEAD_LETTER_QUEUE,
            durable=True,
        )
        await dead_letter_queue.bind(dead_letter)

        # The scoring queue. A message that is rejected without a requeue goes
        # straight to the dead-letter exchange.
        scoring_queue = await self._channel.declare_queue(
            AI_SCORING_QUEUE,
            durable=True,
            arguments={
                "x-dead-letter-exchange": DEAD_LETTER_EXCHANGE,
                "x-dead-letter-routing-key": DEAD_LETTER_QUEUE,
            },
        )
        await scoring_queue.bind(self._exchange, routing_key=APPLICATION_SUBMITTED)

        # The retry queue. A failed run is published here, waits for its TTL
        # and is dead-lettered back onto the scoring queue.
        retry_queue = await self._channel.declare_queue(
            AI_SCORING_RETRY_QUEUE,
            durable=True,
            arguments={
                "x-message-ttl": SCORING_RETRY_DELAY_MS,
                "x-dead-letter-exchange": EVENTS_EXCHANGE,
                "x-dead-letter-routing-key": APPLICATION_SUBMITTED,
            },
        )
        await retry_queue.bind(self._exchange, routing_key=APPLICATION_SUBMITTED_RETRY)

        logger.info(
            "Connected to RabbitMQ at %s:%s (queues: %s, %s, %s)",
            self._settings.rabbitmq_host,
            self._settings.rabbitmq_port,
            AI_SCORING_QUEUE,
            AI_SCORING_RETRY_QUEUE,
            DEAD_LETTER_QUEUE,
        )

    async def close(self) -> None:
        """Closes the connection; the manager can be reconnected afterwards."""
        connection = self._connection
        self._connection = None
        self._channel = None
        self._exchange = None

        if connection is None:
            return
        try:
            await connection.close()
        except Exception:
            logger.debug("RabbitMQ connection was already closed")

    async def publish(self, routing_key: str, payload: dict[str, Any]) -> None:
        """Publishes one durable JSON message."""
        body = json.dumps(payload, default=str).encode("utf-8")
        await self.exchange.publish(
            Message(
                body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
                content_encoding="utf-8",
            ),
            routing_key=routing_key,
        )

    async def get_scoring_queue(self) -> AbstractQueue:
        """The queue the scoring consumer reads from."""
        if self._channel is None:
            raise RuntimeError("RabbitMQ is not connected")
        return await self._channel.get_queue(AI_SCORING_QUEUE)

    async def publish_retry(self, payload: dict[str, Any], attempt: int) -> None:
        """Sends a failed run to the retry queue."""
        body = json.dumps(payload, default=str).encode("utf-8")
        await self.exchange.publish(
            Message(
                body,
                delivery_mode=DeliveryMode.PERSISTENT,
                content_type="application/json",
                headers={"x-attempt": attempt},
            ),
            routing_key=APPLICATION_SUBMITTED_RETRY,
        )
