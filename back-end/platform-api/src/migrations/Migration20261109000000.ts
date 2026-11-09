import { Migration } from '@mikro-orm/migrations';

/**
 * Recruiter provenance and the denormalized experience total used by the
 * candidates list.
 *
 * - `created_by` mirrors `jobs.created_by` (nullable, RESTRICT) so a
 *   recruiter-created candidate keeps an auditable owner.
 * - `total_experience_months` is backfilled in the same migration using the
 *   same merge rules as `experience-calculator.ts`: overlapping/adjacent jobs
 *   are merged, open-ended jobs end today, future dates are clamped, and each
 *   merged range is converted to whole months (inclusive days / 30.4375).
 *
 * The downgrade removes both columns and their index/FK, restoring the
 * pre-module structure. The derived data is intentionally discarded because
 * the old structure has nowhere to keep it.
 */
export class Migration20261109000000 extends Migration {
  override up(): void {
    this.addSql(`ALTER TABLE "candidates" ADD COLUMN "created_by" uuid NULL;`);
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN "total_experience_months" integer NOT NULL DEFAULT 0;`,
    );
    this.addSql(
      `CREATE INDEX "candidates_created_by_index" ON "candidates" ("created_by");`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD CONSTRAINT "fk_users_id_candidates_created_by" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;`,
    );

    // Backfill the new total from existing experience rows. This mirrors the
    // pure calculator:
    //   - clamp end dates to today (open-ended jobs end today)
    //   - skip ranges that start in the future or end before they start
    //   - merge overlaps and ranges separated by exactly one day
    //   - sum inclusive day counts and round to whole months per merged range
    this.addSql(`
      WITH normalized AS (
        SELECT
          "candidate_id",
          "start_date",
          LEAST(COALESCE("end_date", CURRENT_DATE), CURRENT_DATE) AS "end_date"
        FROM "candidate_experience"
        WHERE "start_date" IS NOT NULL
          AND "start_date" <= CURRENT_DATE
          AND "start_date" <= LEAST(COALESCE("end_date", CURRENT_DATE), CURRENT_DATE)
      ),
      ordered AS (
        SELECT
          "candidate_id",
          "start_date",
          "end_date",
          MAX("end_date") OVER (
            PARTITION BY "candidate_id"
            ORDER BY "start_date"
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ) AS "previous_max_end"
        FROM normalized
      ),
      grouped AS (
        SELECT
          "candidate_id",
          "start_date",
          "end_date",
          SUM(
            CASE
              WHEN "previous_max_end" IS NULL
                OR "start_date" > "previous_max_end" + 1
              THEN 1
              ELSE 0
            END
          ) OVER (
            PARTITION BY "candidate_id"
            ORDER BY "start_date"
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS "group_id"
        FROM ordered
      ),
      merged AS (
        SELECT
          "candidate_id",
          MIN("start_date") AS "start_date",
          MAX("end_date") AS "end_date"
        FROM grouped
        GROUP BY "candidate_id", "group_id"
      ),
      totals AS (
        SELECT
          "candidate_id",
          SUM(ROUND(("end_date" - "start_date" + 1) / 30.4375))::integer AS "total_months"
        FROM merged
        GROUP BY "candidate_id"
      )
      UPDATE "candidates" AS "c"
      SET "total_experience_months" = "t"."total_months"
      FROM "totals" AS "t"
      WHERE "c"."id" = "t"."candidate_id";
    `);
  }

  override down(): void {
    this.addSql(
      `ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "fk_users_id_candidates_created_by";`,
    );
    this.addSql(`DROP INDEX IF EXISTS "candidates_created_by_index";`);
    this.addSql(
      `ALTER TABLE "candidates" DROP COLUMN IF EXISTS "total_experience_months";`,
    );
    this.addSql(`ALTER TABLE "candidates" DROP COLUMN IF EXISTS "created_by";`);
  }
}
