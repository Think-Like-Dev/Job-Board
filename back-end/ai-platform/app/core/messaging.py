"""RabbitMQ topology shared by the AI service.

The names below are the contract with the core API. Both services declare the
same names; the core API's copy lives in
`back-end/platform-api/src/modules/messaging/messaging.constants.ts`.
"""

from __future__ import annotations

# Exchanges.
EVENTS_EXCHANGE = "ats.events"
DEAD_LETTER_EXCHANGE = "ats.dlx"

# Queues.
AI_SCORING_QUEUE = "ai.resume.scoring"
AI_SCORING_RETRY_QUEUE = "ai.resume.scoring.retry"
DEAD_LETTER_QUEUE = "ats.dlq"

# Routing keys.
APPLICATION_SUBMITTED = "application.submitted"
APPLICATION_CANCELLED = "application.cancelled"
APPLICATION_SUBMITTED_RETRY = "application.submitted.retry"
SCORING_COMPLETED = "scoring.completed"
SCORING_FAILED = "scoring.failed"

# Retry policy for a failed scoring run: how many times the message is
# redelivered from the retry queue before it is dead-lettered, and how long it
# waits in between.
SCORING_MAX_ATTEMPTS = 3
SCORING_RETRY_DELAY_MS = 30_000
