import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { type EntityManager, EntityRepository } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { OutboxStatus } from '@common/constants/enums';
import { OutboxEvent, OutboxEventSchema } from './outbox.schema';

/** What the caller wants to publish. The envelope is added by the service. */
export interface OutboxMessage {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  routingKey: string;
  payload: Record<string, unknown>;
}

/**
 * Writes domain events into the transactional outbox.
 *
 * `enqueue` must be called with the caller's transactional `EntityManager`
 * so the event commits together with the state change that caused it.
 */
@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEventSchema)
    private readonly repository: EntityRepository<OutboxEvent>,
  ) {}

  /** Enqueues an event and returns the stored row. */
  enqueue(em: EntityManager, message: OutboxMessage): OutboxEvent {
    const id = randomUUID();
    const now = new Date();

    const event = em.create(OutboxEventSchema, {
      id,
      aggregateType: message.aggregateType,
      aggregateId: message.aggregateId,
      eventType: message.eventType,
      routingKey: message.routingKey,
      payload: {
        eventId: id,
        eventType: message.eventType,
        occurredAt: now.toISOString(),
        ...message.payload,
      },
      status: OutboxStatus.PENDING,
      attempts: 0,
      lastError: null,
      nextAttemptAt: now,
      publishedAt: null,
      createdAt: now,
    });

    em.persist(event);
    return event;
  }
}
