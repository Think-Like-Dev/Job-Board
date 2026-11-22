import { Migration } from '@mikro-orm/migrations';

/**
 * Why a scoring run produced no score.
 *
 * `failure_reason` carried a human sentence the API had to string-match to
 * tell "the document needs a review" from a generic failure. The AI service
 * now sends an explicit code, and the reason stays readable for the recruiter.
 * Existing failed rows are backfilled from the sentence the old AI service
 * wrote.
 */
export class Migration20261122000001 extends Migration {
  override up(): void {
    this.addSql(
      `ALTER TABLE "application_ai_scores" ADD COLUMN IF NOT EXISTS "failure_code" text NULL;`,
    );

    this.addSql(
      `UPDATE "application_ai_scores"
          SET "failure_code" = 'needs_review'
        WHERE "status" = 'FAILED'
          AND "failure_reason" = 'the document needs a manual review'
          AND "failure_code" IS NULL;`,
    );
    this.addSql(
      `UPDATE "application_ai_scores"
          SET "failure_code" = 'scoring_failed'
        WHERE "status" = 'FAILED'
          AND "failure_code" IS NULL;`,
    );

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "application_ai_scores"
            ADD CONSTRAINT "application_ai_scores_failure_code_check"
            CHECK ("failure_code" IS NULL OR "failure_code" IN ('needs_review', 'scoring_failed'));
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
  }

  override down(): void {
    this.addSql(
      `ALTER TABLE "application_ai_scores" DROP CONSTRAINT IF EXISTS "application_ai_scores_failure_code_check";`,
    );
    this.addSql(
      `ALTER TABLE "application_ai_scores" DROP COLUMN IF EXISTS "failure_code";`,
    );
  }
}
