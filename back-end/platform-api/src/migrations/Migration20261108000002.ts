import { Migration } from '@mikro-orm/migrations';

/**
 * Persists candidate-saved jobs. A join table keeps `(candidate_id, job_id)`
 * unique and referentially valid, unlike an array column on `candidates`.
 */
export class Migration20261108000002 extends Migration {
  override up(): void {
    this.addSql(`
        CREATE TABLE IF NOT EXISTS "candidate_bookmarks" (
          "id" uuid NOT NULL DEFAULT gen_random_uuid(),
          "candidate_id" uuid NOT NULL,
          "job_id" uuid NOT NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY ("id")
        );
      `);

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "candidate_bookmarks"
            ADD CONSTRAINT "fk_candidates_id_bookmarks"
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
          ALTER TABLE "candidate_bookmarks"
            ADD CONSTRAINT "fk_jobs_id_bookmarks"
            FOREIGN KEY ("job_id") REFERENCES "jobs" ("id")
            ON UPDATE NO ACTION ON DELETE CASCADE
            DEFERRABLE INITIALLY IMMEDIATE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "candidate_bookmarks_candidate_job_unique" ON "candidate_bookmarks" ("candidate_id", "job_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_bookmarks_candidate_id_index" ON "candidate_bookmarks" ("candidate_id");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidate_bookmarks_job_id_index" ON "candidate_bookmarks" ("job_id");`,
    );
  }

  override down(): void {
    this.addSql(`DROP TABLE IF EXISTS "candidate_bookmarks" CASCADE;`);
  }
}
