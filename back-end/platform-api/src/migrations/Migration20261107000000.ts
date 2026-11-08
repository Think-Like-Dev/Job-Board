import { Migration } from '@mikro-orm/migrations';

/**
 * Applications module schema: the applications table, its status-history
 * trail, and the candidate's default profile resume pointer.
 */
export class Migration20261107000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "application_status" AS ENUM (
            'DRAFT',
            'APPLIED',
            'IN_REVIEW',
            'SHORTLISTED',
            'INTERVIEW',
            'OFFER_EXTENDED',
            'OFFER_ACCEPTED',
            'OFFER_REJECTED',
            'REJECTED',
            'WITHDRAWN',
            'AUTO_REJECTED'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "resume_file_id" uuid NULL;`,
    );
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidates"
            ADD CONSTRAINT "fk_files_id_candidates_resume"
            FOREIGN KEY ("resume_file_id") REFERENCES "files" ("id")
            ON UPDATE NO ACTION ON DELETE SET NULL
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "applications" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "candidate_id" uuid NOT NULL,
          "job_id" uuid NOT NULL,
          "resume_file_id" uuid NOT NULL,
          "cover_letter_file_id" uuid NULL,
          "status" "application_status" NOT NULL DEFAULT 'APPLIED',
          "applied_at" timestamptz NULL,
          "withdrawn_at" timestamptz NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "applications"
            ADD CONSTRAINT "fk_candidates_id_applications"
            FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id")
            ON UPDATE NO ACTION ON DELETE RESTRICT
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "applications"
            ADD CONSTRAINT "fk_jobs_id_applications"
            FOREIGN KEY ("job_id") REFERENCES "jobs" ("id")
            ON UPDATE NO ACTION ON DELETE RESTRICT
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "applications"
            ADD CONSTRAINT "fk_files_id_applications_resume"
            FOREIGN KEY ("resume_file_id") REFERENCES "files" ("id")
            ON UPDATE NO ACTION ON DELETE RESTRICT
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "applications"
            ADD CONSTRAINT "fk_files_id_applications_cover"
            FOREIGN KEY ("cover_letter_file_id") REFERENCES "files" ("id")
            ON UPDATE NO ACTION ON DELETE SET NULL
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "applications_candidate_job_unique" ON "applications" ("candidate_id", "job_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "applications_job_id_index" ON "applications" ("job_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "applications_candidate_id_index" ON "applications" ("candidate_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "applications_status_index" ON "applications" ("status");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "applications_applied_at_index" ON "applications" ("applied_at");`,
    );

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "application_status_history" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "application_id" uuid NOT NULL,
          "old_status" "application_status" NULL,
          "new_status" "application_status" NOT NULL,
          "reason" text NULL,
          "changed_by" uuid NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "application_status_history"
            ADD CONSTRAINT "fk_applications_id_status_history"
            FOREIGN KEY ("application_id") REFERENCES "applications" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "application_status_history_application_id_index" ON "application_status_history" ("application_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "application_status_history_created_at_index" ON "application_status_history" ("created_at");`,
    );
  }

  override down(): void {
    this.addSql(`DROP TABLE IF EXISTS "application_status_history" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "applications" CASCADE;`);
    this.addSql(
      `ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "fk_files_id_candidates_resume";`,
    );
    this.addSql(
      `ALTER TABLE "candidates" DROP COLUMN IF EXISTS "resume_file_id";`,
    );
    this.addSql(`DROP TYPE IF EXISTS "application_status" CASCADE;`);
  }
}
