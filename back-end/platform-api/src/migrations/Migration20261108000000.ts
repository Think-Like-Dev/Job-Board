import { Migration } from '@mikro-orm/migrations';

/**
 * Candidate profile Phase 2.5: live education/experience/skills/certifications,
 * address fields, and immutable JSONB profile snapshots.
 *
 * Snapshots are only created when a profile update finds applications pointing
 * at live data. Live data stays normalized for filtering; snapshots preserve
 * exactly what the recruiter saw at submission time.
 */
export class Migration20261108000000 extends Migration {
  override up(): void {
    this.addSql(
      `ALTER TYPE "file_type" ADD VALUE IF NOT EXISTS 'CERTIFICATION';`,
    );

    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "cover_letter_file_id" uuid NULL;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "current_location" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "address" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "city" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "state" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "country" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "postal_code" varchar(255) NULL;`,
    );

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidates"
            ADD CONSTRAINT "fk_files_id_candidates_cover"
            FOREIGN KEY ("cover_letter_file_id") REFERENCES "files" ("id")
            ON UPDATE NO ACTION ON DELETE SET NULL
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "skills" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "name" varchar(255) NOT NULL,
          "normalized_name" varchar(255) NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_unique" ON "skills" ("name");`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "skills_normalized_name_unique" ON "skills" ("normalized_name");`,
    );

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "candidate_profile_versions" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "candidate_id" uuid NOT NULL,
          "version_number" integer NOT NULL,
          "profile_data" jsonb NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_profile_versions"
            ADD CONSTRAINT "fk_candidates_id_candidate_profile_versions"
            FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "candidate_profile_versions_candidate_version_unique" ON "candidate_profile_versions" ("candidate_id", "version_number");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_profile_versions_candidate_id_index" ON "candidate_profile_versions" ("candidate_id");`,
    );

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "candidate_education" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "candidate_id" uuid NOT NULL,
          "institution" varchar(255) NOT NULL,
          "degree" varchar(255) NOT NULL,
          "field_of_study" varchar(255) NOT NULL,
          "start_date" date NOT NULL,
          "end_date" date NULL,
          "grade" varchar(255) NULL,
          "gpa" numeric(4,2) NULL,
          "additional_details" text NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_education"
            ADD CONSTRAINT "fk_candidates_id_candidate_education"
            FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_education_candidate_id_index" ON "candidate_education" ("candidate_id");`,
    );

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "candidate_experience" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "candidate_id" uuid NOT NULL,
          "company_name" varchar(255) NOT NULL,
          "job_title" varchar(255) NOT NULL,
          "start_date" date NOT NULL,
          "end_date" date NULL,
          "salary" varchar(255) NULL,
          "description" text NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_experience"
            ADD CONSTRAINT "fk_candidates_id_candidate_experience"
            FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_experience_candidate_id_index" ON "candidate_experience" ("candidate_id");`,
    );

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "candidate_skills" (
          "candidate_id" uuid NOT NULL,
          "skill_id" uuid NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("candidate_id", "skill_id")
        );
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_skills"
            ADD CONSTRAINT "fk_candidates_id_candidate_skills"
            FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_skills"
            ADD CONSTRAINT "fk_skills_id_candidate_skills"
            FOREIGN KEY ("skill_id") REFERENCES "skills" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_skills_skill_id_index" ON "candidate_skills" ("skill_id");`,
    );

    this.addSql(`
        CREATE TABLE IF NOT EXISTS "candidate_certifications" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "candidate_id" uuid NOT NULL,
          "title" varchar(255) NOT NULL,
          "issuer" varchar(255) NULL,
          "skill_id" uuid NULL,
          "credential_url" text NULL,
          "file_id" uuid NULL,
          "issue_date" date NULL,
          "expiry_date" date NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id"),
          CONSTRAINT "candidate_certifications_credential_check"
            CHECK ("credential_url" IS NOT NULL OR "file_id" IS NOT NULL)
        );
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_certifications"
            ADD CONSTRAINT "fk_candidates_id_candidate_certifications"
            FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_certifications"
            ADD CONSTRAINT "fk_skills_id_candidate_certifications"
            FOREIGN KEY ("skill_id") REFERENCES "skills" ("id")
            ON UPDATE NO ACTION ON DELETE SET NULL
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_certifications"
            ADD CONSTRAINT "fk_files_id_candidate_certifications"
            FOREIGN KEY ("file_id") REFERENCES "files" ("id")
            ON UPDATE NO ACTION ON DELETE RESTRICT
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_certifications_candidate_id_index" ON "candidate_certifications" ("candidate_id");`,
    );

    this.addSql(
      `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "profile_version_id" uuid NULL;`,
    );
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "applications"
            ADD CONSTRAINT "fk_candidate_profile_versions_id_applications"
            FOREIGN KEY ("profile_version_id") REFERENCES "candidate_profile_versions" ("id")
            ON UPDATE NO ACTION ON DELETE RESTRICT
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "applications_profile_version_id_index" ON "applications" ("profile_version_id");`,
    );
  }

  override down(): void {
    this.addSql(
      `ALTER TABLE "applications" DROP CONSTRAINT IF EXISTS "fk_candidate_profile_versions_id_applications";`,
    );
    this.addSql(
      `DROP INDEX IF EXISTS "applications_profile_version_id_index";`,
    );
    this.addSql(
      `ALTER TABLE "applications" DROP COLUMN IF EXISTS "profile_version_id";`,
    );

    this.addSql(`DROP TABLE IF EXISTS "candidate_certifications" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "candidate_skills" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "candidate_experience" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "candidate_education" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "candidate_profile_versions" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "skills" CASCADE;`);

    this.addSql(
      `ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "fk_files_id_candidates_cover";`,
    );
    this.addSql(
      `ALTER TABLE "candidates" DROP COLUMN IF EXISTS "cover_letter_file_id";`,
    );
    this.addSql(
      `ALTER TABLE "candidates" DROP COLUMN IF EXISTS "current_location";`,
    );
    this.addSql(`ALTER TABLE "candidates" DROP COLUMN IF EXISTS "address";`);
    this.addSql(`ALTER TABLE "candidates" DROP COLUMN IF EXISTS "city";`);
    this.addSql(`ALTER TABLE "candidates" DROP COLUMN IF EXISTS "state";`);
    this.addSql(`ALTER TABLE "candidates" DROP COLUMN IF EXISTS "country";`);
    this.addSql(
      `ALTER TABLE "candidates" DROP COLUMN IF EXISTS "postal_code";`,
    );

    // PostgreSQL has no DROP VALUE for enums; the unused CERTIFICATION value
    // is harmless if the migration is rolled back.
  }
}
