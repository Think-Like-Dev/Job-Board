import { Migration } from '@mikro-orm/migrations';

/**
 * Transactional outbox for the events that cross into the AI service.
 *
 * A record is written in the same transaction as the state change it
 * describes, so an event can never exist without its cause, nor be lost
 * because the process died between the commit and the publish.
 *
 * The relay picks up `PENDING` rows, publishes them to RabbitMQ and marks
 * them `PUBLISHED`. A failed publish increments `attempts` and defers the
 * next try; after `RABBITMQ_MAX_PUBLISH_ATTEMPTS` the row becomes `FAILED`
 * and stays in the table for inspection.
 */
export class Migration20261114000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "outbox_status" AS ENUM (
            'PENDING',
            'PUBLISHED',
            'FAILED'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "event_outbox" (
          "id" uuid NOT NULL,
          "aggregate_type" text NOT NULL,
          "aggregate_id" uuid NOT NULL,
          "event_type" text NOT NULL,
          "routing_key" text NOT NULL,
          "payload" jsonb NOT NULL,
          "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
          "attempts" integer NOT NULL DEFAULT 0,
          "last_error" text NULL,
          "next_attempt_at" timestamptz NOT NULL DEFAULT now(),
          "published_at" timestamptz NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    // The relay claims work with
    //   WHERE status = 'PENDING' AND next_attempt_at <= now()
    // so the index follows that predicate.
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "event_outbox_pending_index" ON "event_outbox" ("status", "next_attempt_at");`,
    );
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS "event_outbox_pending_index";`);
    this.addSql(`DROP TABLE IF EXISTS "event_outbox";`);
    this.addSql(`DROP TYPE IF EXISTS "outbox_status";`);
  }
}
