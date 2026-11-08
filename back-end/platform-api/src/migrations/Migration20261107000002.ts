import { Migration } from '@mikro-orm/migrations';

/**
 * Explicit, revocable read grants for files that a candidate does not own.
 * Recruiters use these to share offer letters or other documents with one
 * candidate without changing the file's owner.
 */
export class Migration20261107000002 extends Migration {
  override up(): void {
    this.addSql(`
        CREATE TABLE IF NOT EXISTS "file_access_grants" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "file_id" uuid NOT NULL,
          "candidate_id" uuid NOT NULL,
          "granted_by" uuid NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "file_access_grants"
            ADD CONSTRAINT "fk_files_id_file_access_grants"
            FOREIGN KEY ("file_id") REFERENCES "files" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "file_access_grants"
            ADD CONSTRAINT "fk_candidates_id_file_access_grants"
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
          ALTER TABLE "file_access_grants"
            ADD CONSTRAINT "fk_users_id_file_access_grants"
            FOREIGN KEY ("granted_by") REFERENCES "users" ("id")
            ON UPDATE NO ACTION ON DELETE SET NULL
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "file_access_grants_file_candidate_unique" ON "file_access_grants" ("file_id", "candidate_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "file_access_grants_candidate_index" ON "file_access_grants" ("candidate_id");`,
    );
  }

  override down(): void {
    this.addSql(`DROP TABLE IF EXISTS "file_access_grants" CASCADE;`);
  }
}
