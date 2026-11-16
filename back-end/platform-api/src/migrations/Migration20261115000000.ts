import { Migration } from '@mikro-orm/migrations';

/**
 * The projection of the AI service's assessment.
 *
 * The AI service owns the real match in its own database. This table holds
 * what the recruiter UI reads: the score, the narrative and the skills that
 * matched or did not. One row per application.
 *
 * The row is created as `PENDING` when the scoring request is queued and
 * filled in when the `scoring.completed` event arrives, so the recruiter sees
 * that a score is on its way.
 */
export class Migration20261115000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "ai_score_status" AS ENUM (
            'PENDING',
            'SCORED',
            'SCORE_ONLY',
            'FAILED'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "application_ai_scores" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "application_id" uuid NOT NULL,
          "candidate_id" uuid NOT NULL,
          "job_id" uuid NOT NULL,
          "status" "ai_score_status" NOT NULL DEFAULT 'PENDING',
          "score" numeric(5,2) NULL,
          "weights_version" text NULL,
          "component_scores" jsonb NULL,
          "matching_skills" jsonb NULL,
          "missing_skills" jsonb NULL,
          "ai_summary" text NULL,
          "strengths" jsonb NULL,
          "risks" jsonb NULL,
          "interview_questions" jsonb NULL,
          "knockout_reason" text NULL,
          "failure_reason" text NULL,
          "failure_message" text NULL,
          "event_id" uuid NULL,
          "scored_at" timestamptz NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    // One assessment per application: the upsert that writes the result
    // depends on this constraint.
    this.addSql(
      `ALTER TABLE "application_ai_scores" ADD CONSTRAINT "application_ai_scores_application_id_unique" UNIQUE ("application_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "application_ai_scores_candidate_id_index" ON "application_ai_scores" ("candidate_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "application_ai_scores_job_id_index" ON "application_ai_scores" ("job_id");`,
    );
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS "application_ai_scores_job_id_index";`);
    this.addSql(
      `DROP INDEX IF EXISTS "application_ai_scores_candidate_id_index";`,
    );
    this.addSql(
      `ALTER TABLE "application_ai_scores" DROP CONSTRAINT IF EXISTS "application_ai_scores_application_id_unique";`,
    );
    this.addSql(`DROP TABLE IF EXISTS "application_ai_scores";`);
    this.addSql(`DROP TYPE IF EXISTS "ai_score_status";`);
  }
}
