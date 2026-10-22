import { Migration } from '@mikro-orm/migrations';

/**
 * Jobs schema for the recruiter create-job API.
 *
 * Array/settings fields (`work_mode`, `skills`, `benefits`, `application_settings`,
 * `compensation`, ...) are JSONB so the wizard payload can be stored directly.
 * `job_skills` / `job_application_questions` remain planned for later modules.
 */
export class Migration20261021000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "job_status" AS ENUM (
            'DRAFT',
            'PUBLISHED',
            'ARCHIVED',
            'CLOSED'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "employment_type" AS ENUM (
            'FULL_TIME',
            'PART_TIME',
            'CONTRACT',
            'INTERN'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "jobs" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "code" varchar(50) NOT NULL,
          "title" varchar(255) NOT NULL,
          "category" varchar(255) NOT NULL DEFAULT '',
          "department" varchar(255) NULL,
          "designation" varchar(255) NULL,
          "employment_type" "employment_type" NOT NULL,
          "location" varchar(255) NOT NULL DEFAULT '',
          "description" text NOT NULL DEFAULT '',
          "responsibilities" text NULL,
          "years_of_experience" varchar(100) NULL,
          "compensation" jsonb NULL,
          "work_mode" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "work_shift_timing" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "skills" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "keywords" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "benefits" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "vacancies" integer NOT NULL DEFAULT 1,
          "total_interview_rounds" integer NULL,
          "last_application_date" date NULL,
          "application_settings" jsonb NULL,
          "hiring_process" jsonb NULL,
          "status" "job_status" NOT NULL DEFAULT 'DRAFT',
          "created_by" uuid NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    this.addSql(
      `ALTER TABLE "jobs" ADD CONSTRAINT "jobs_code_unique" UNIQUE ("code");`,
    );
    this.addSql(
      `ALTER TABLE "jobs" ADD CONSTRAINT "fk_users_id_jobs" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;`,
    );
    this.addSql(`CREATE INDEX "jobs_status_index" ON "jobs" ("status");`);
    this.addSql(
      `CREATE INDEX "jobs_created_by_index" ON "jobs" ("created_by");`,
    );
  }

  override down(): void {
    this.addSql(`DROP TABLE IF EXISTS "jobs" CASCADE;`);
    this.addSql(`DROP TYPE IF EXISTS "job_status" CASCADE;`);
    this.addSql(`DROP TYPE IF EXISTS "employment_type" CASCADE;`);
  }
}
