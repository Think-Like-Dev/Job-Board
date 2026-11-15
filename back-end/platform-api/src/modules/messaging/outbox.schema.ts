import { EntitySchema } from '@mikro-orm/core';
import { OutboxStatus } from '@common/constants/enums';

/**
 * A domain event waiting to be published to RabbitMQ.
 *
 * The row is written inside the transaction that caused the event, so the
 * event and its cause commit together. `id` doubles as the event id that
 * travels in the message envelope, which is what consumers deduplicate on.
 */
export interface OutboxEvent {
  id: string;
  /** What the event is about, e.g. `application`. */
  aggregateType: string;
  /** The id of the thing the event is about, e.g. the application id. */
  aggregateId: string;
  /** What happened, e.g. `application.submitted`. */
  eventType: string;
  /** The RabbitMQ routing key the event is published with. */
  routingKey: string;
  /** The full message body, including the envelope. */
  payload: Record<string, unknown>;
  status: OutboxStatus;
  /** How many times publishing has been tried. */
  attempts: number;
  /** Why the last attempt failed. */
  lastError?: string | null;
  /** When the next attempt may run. */
  nextAttemptAt: Date;
  /** When the broker acknowledged the message. */
  publishedAt?: Date | null;
  createdAt: Date;
}

export const OutboxEventSchema = new EntitySchema<OutboxEvent>({
  name: 'OutboxEvent',
  tableName: 'event_outbox',
  indexes: [
    {
      name: 'event_outbox_pending_index',
      properties: ['status', 'nextAttemptAt'],
    },
  ],
  properties: {
    id: { type: 'uuid', primary: true },
    aggregateType: { type: 'string' },
    aggregateId: { type: 'uuid' },
    eventType: { type: 'string' },
    routingKey: { type: 'string' },
    payload: { type: 'json', columnType: 'jsonb' },
    status: {
      enum: true,
      items: () => OutboxStatus,
      nativeEnumName: 'outbox_status',
      default: OutboxStatus.PENDING,
    },
    attempts: { type: 'integer', default: 0 },
    lastError: { type: 'text', nullable: true },
    nextAttemptAt: { type: 'datetime', defaultRaw: 'now()' },
    publishedAt: { type: 'datetime', nullable: true },
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
  },
});
