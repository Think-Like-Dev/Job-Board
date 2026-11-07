import { Migration } from '@mikro-orm/migrations';

/**
 * Job lifecycle columns plus denormalised compensation fields used by the
 * list filter/sort. Publication/archive timestamps and the soft-delete marker
 * live here too; every delete in this application is a soft delete, so
 * `deleted_at` is filtered out of job queries rather than removing rows.
 */
export class Migration20261104000000 extends Migration {
  override up(): void {
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "published_at" timestamptz NULL;`,
    );
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz NULL;`,
    );
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;`,
    );

    // Backfill jobs created before these columns existed.
    this.addSql(
      `UPDATE "jobs" SET "published_at" = "created_at" WHERE "status" = 'PUBLISHED' AND "published_at" IS NULL;`,
    );
    this.addSql(
      `UPDATE "jobs" SET "archived_at" = "updated_at" WHERE "status" = 'ARCHIVED' AND "archived_at" IS NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "jobs_deleted_at_index" ON "jobs" ("deleted_at");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "jobs_last_application_date_index" ON "jobs" ("last_application_date");`,
    );

    // Denormalised compensation fields used by the job-list filter and sort.
    // `compensation_min`/`compensation_max` bound the pay window: a fixed
    // salary uses the same value for both; negotiable/not-provided stay null.
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "compensation_type" text NULL;`,
    );
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "compensation_min" double precision NULL;`,
    );
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "compensation_max" double precision NULL;`,
    );
    this.addSql(
      `ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "compensation_currency" text NULL;`,
    );

    this.addSql(
      `UPDATE "jobs"
       SET
         "compensation_type" = "compensation"->>'type',
         "compensation_min" = CASE
           WHEN "compensation"->>'type' = 'FIXED' THEN ("compensation"->>'amount')::double precision
           WHEN "compensation"->>'type' = 'RANGE' THEN ("compensation"->'amount'->>0)::double precision
           ELSE NULL
         END,
         "compensation_max" = CASE
           WHEN "compensation"->>'type' = 'FIXED' THEN ("compensation"->>'amount')::double precision
           WHEN "compensation"->>'type' = 'RANGE' THEN ("compensation"->'amount'->>1)::double precision
           ELSE NULL
         END,
         "compensation_currency" = "compensation"->>'currency'
       WHERE "compensation" IS NOT NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "jobs_compensation_type_index" ON "jobs" ("compensation_type");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "jobs_compensation_min_index" ON "jobs" ("compensation_min");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "jobs_compensation_max_index" ON "jobs" ("compensation_max");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "jobs_compensation_currency_index" ON "jobs" ("compensation_currency");`,
    );
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS "jobs_compensation_currency_index";`);
    this.addSql(`DROP INDEX IF EXISTS "jobs_compensation_max_index";`);
    this.addSql(`DROP INDEX IF EXISTS "jobs_compensation_min_index";`);
    this.addSql(`DROP INDEX IF EXISTS "jobs_compensation_type_index";`);
    this.addSql(
      `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "compensation_currency";`,
    );
    this.addSql(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "compensation_max";`);
    this.addSql(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "compensation_min";`);
    this.addSql(
      `ALTER TABLE "jobs" DROP COLUMN IF EXISTS "compensation_type";`,
    );
    this.addSql(`DROP INDEX IF EXISTS "jobs_last_application_date_index";`);
    this.addSql(`DROP INDEX IF EXISTS "jobs_deleted_at_index";`);
    this.addSql(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "deleted_at";`);
    this.addSql(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "archived_at";`);
    this.addSql(`ALTER TABLE "jobs" DROP COLUMN IF EXISTS "published_at";`);
  }
}
