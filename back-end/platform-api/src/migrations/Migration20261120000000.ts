import { Migration } from '@mikro-orm/migrations';

/**
 * Soft delete everywhere.
 *
 * The project rule is that a record is removed by setting `deleted_at`, never
 * by deleting the row. The one exception is file metadata, which is removed
 * with its stored object (see `FilesService.remove`); drafts are also still
 * hard-deleted because they are unsubmitted work product that owns uploaded
 * files, which a NOT NULL resume FK would otherwise keep alive forever.
 *
 * Each table gets the column plus a default `softDelete` query filter in its
 * EntitySchema, so no query has to repeat `deleted_at is null`.
 *
 * Uniqueness has to follow the same rule: a deleted row must not block a live
 * one. Every unique constraint that could collide with a soft-deleted row is
 * recreated as a partial unique index (`where deleted_at is null`).
 */
export class Migration20261120000000 extends Migration {
  override up(): void {
    const tables = [
      'users',
      'candidates',
      'applications',
      'candidate_education',
      'candidate_experience',
      'candidate_certifications',
      'candidate_skills',
      'candidate_bookmarks',
      'file_access_grants',
    ];

    for (const table of tables) {
      this.addSql(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz NULL;`,
      );
      this.addSql(
        `CREATE INDEX IF NOT EXISTS "${table}_deleted_at_index" ON "${table}" ("deleted_at");`,
      );
    }

    // users.email / candidates.email were table constraints.
    this.addSql(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email") WHERE "deleted_at" IS NULL;`,
    );

    this.addSql(
      `ALTER TABLE "candidates" DROP CONSTRAINT IF EXISTS "candidates_email_unique";`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "candidates_email_unique" ON "candidates" ("email") WHERE "deleted_at" IS NULL;`,
    );

    // These three were already unique indexes, so they are replaced in place.
    this.addSql(`DROP INDEX IF EXISTS "applications_candidate_job_unique";`);
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "applications_candidate_job_unique" ON "applications" ("candidate_id", "job_id") WHERE "deleted_at" IS NULL;`,
    );

    this.addSql(
      `DROP INDEX IF EXISTS "candidate_bookmarks_candidate_job_unique";`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "candidate_bookmarks_candidate_job_unique" ON "candidate_bookmarks" ("candidate_id", "job_id") WHERE "deleted_at" IS NULL;`,
    );

    this.addSql(
      `DROP INDEX IF EXISTS "file_access_grants_file_candidate_unique";`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "file_access_grants_file_candidate_unique" ON "file_access_grants" ("file_id", "candidate_id") WHERE "deleted_at" IS NULL;`,
    );
  }

  override down(): void {
    this.addSql(
      `DROP INDEX IF EXISTS "file_access_grants_file_candidate_unique";`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "file_access_grants_file_candidate_unique" ON "file_access_grants" ("file_id", "candidate_id");`,
    );

    this.addSql(
      `DROP INDEX IF EXISTS "candidate_bookmarks_candidate_job_unique";`,
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "candidate_bookmarks_candidate_job_unique" ON "candidate_bookmarks" ("candidate_id", "job_id");`,
    );

    this.addSql(`DROP INDEX IF EXISTS "applications_candidate_job_unique";`);
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "applications_candidate_job_unique" ON "applications" ("candidate_id", "job_id");`,
    );

    this.addSql(`DROP INDEX IF EXISTS "candidates_email_unique";`);
    this.addSql(
      `ALTER TABLE "candidates" ADD CONSTRAINT "candidates_email_unique" UNIQUE ("email");`,
    );

    this.addSql(`DROP INDEX IF EXISTS "users_email_unique";`);
    this.addSql(
      `ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");`,
    );

    const tables = [
      'users',
      'candidates',
      'applications',
      'candidate_education',
      'candidate_experience',
      'candidate_certifications',
      'candidate_skills',
      'candidate_bookmarks',
      'file_access_grants',
    ];

    for (const table of tables) {
      this.addSql(`DROP INDEX IF EXISTS "${table}_deleted_at_index";`);
      this.addSql(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "deleted_at";`);
    }
  }
}
