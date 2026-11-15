import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type EntityManager } from '@mikro-orm/core';
import { EntityManager as PostgreSqlEntityManager } from '@mikro-orm/postgresql';
import type { AppConfig } from '@src/config/configuration';
import { OutboxStatus } from '@common/constants/enums';
import { RabbitMqPublisher } from './rabbitmq.publisher';

/** One unpublished outbox row, as claimed by the relay. */
interface ClaimedEvent {
  id: string;
  routing_key: string;
  payload: Record<string, unknown>;
  attempts: number;
}

/** Longest a failed event waits before the next attempt. */
const MAX_BACKOFF_SECONDS = 300;

/**
 * Publishes the outbox records that are waiting to go out.
 *
 * The relay claims rows with `FOR UPDATE SKIP LOCKED`, so two API instances
 * never publish the same record. The publish happens inside the transaction
 * that holds the row lock: if the process dies mid-publish the transaction
 * rolls back and the record is simply retried later. The AI side is
 * idempotent, so a duplicate delivery is harmless.
 */
@Injectable()
export class OutboxRelayService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(OutboxRelayService.name);

  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly em: PostgreSqlEntityManager,
    private readonly publisher: RabbitMqPublisher,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  onApplicationBootstrap(): void {
    const { outboxPollMs } = this.config.get('rabbitmq', { infer: true });
    this.timer = setInterval(() => {
      void this.publishPending();
    }, outboxPollMs);
    this.timer.unref?.();
    this.logger.log(`Outbox relay started (every ${outboxPollMs}ms)`);
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Publishes one batch. Returns how many records reached the broker. */
  async publishPending(): Promise<number> {
    if (this.running) {
      return 0;
    }
    this.running = true;

    try {
      const { outboxBatchSize, maxPublishAttempts } = this.config.get(
        'rabbitmq',
        { infer: true },
      );

      return await this.em.transactional(async (txEm) => {
        const claimed = await this.claim(txEm, outboxBatchSize);
        let published = 0;

        for (const event of claimed) {
          try {
            await this.publisher.publish(event.routing_key, event.payload);
            await txEm.execute(
              `UPDATE "event_outbox"
                  SET "status" = ?, "published_at" = now(), "last_error" = NULL
                WHERE "id" = ?`,
              [OutboxStatus.PUBLISHED, event.id],
            );
            published += 1;
          } catch (error) {
            await this.defer(txEm, event, error, maxPublishAttempts);
          }
        }

        return published;
      });
    } catch (error) {
      this.logger.error(
        `Outbox relay failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async claim(
    em: EntityManager,
    limit: number,
  ): Promise<ClaimedEvent[]> {
    const rows = (await em.getConnection().execute(
      `SELECT "id", "routing_key", "payload", "attempts"
         FROM "event_outbox"
        WHERE "status" = ? AND "next_attempt_at" <= now()
        ORDER BY "created_at"
        LIMIT ?
        FOR UPDATE SKIP LOCKED`,
      [OutboxStatus.PENDING, limit],
    )) as ClaimedEvent[];
    return rows;
  }

  private async defer(
    em: EntityManager,
    event: ClaimedEvent,
    error: unknown,
    maxAttempts: number,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    const attempts = event.attempts + 1;
    const dead = attempts >= maxAttempts;
    const delaySeconds = Math.min(2 ** attempts, MAX_BACKOFF_SECONDS);

    await em.getConnection().execute(
      `UPDATE "event_outbox"
          SET "attempts" = ?,
              "status" = ?,
              "last_error" = ?,
              "next_attempt_at" = now() + (? * interval '1 second')
        WHERE "id" = ?`,
      [
        attempts,
        dead ? OutboxStatus.FAILED : OutboxStatus.PENDING,
        message.slice(0, 2_000),
        delaySeconds,
        event.id,
      ],
    );

    if (dead) {
      this.logger.error(
        `Outbox event ${event.id} (${event.routing_key}) failed permanently after ${attempts} attempts: ${message}`,
      );
    } else {
      this.logger.warn(
        `Outbox event ${event.id} (${event.routing_key}) not published (attempt ${attempts}): ${message}`,
      );
    }
  }
}
