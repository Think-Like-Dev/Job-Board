import { Migration } from '@mikro-orm/migrations';

/**
 * Candidate lifecycle.
 *
 * A profile a recruiter creates manually is `INVITED` until the candidate
 * signs in with an OTP; then it becomes `ACTIVE`. Self-registered candidates
 * are created `ACTIVE`. Existing rows predate the lifecycle and are active.
 * Only `INVITED` profiles may be hard-deleted.
 */
export class Migration20261122000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "candidate_status" AS ENUM ('INVITED', 'ACTIVE');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "status" "candidate_status" NOT NULL DEFAULT 'ACTIVE';`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "candidates_status_index" ON "candidates" ("status");`,
    );
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS "candidates_status_index";`);
    this.addSql(`ALTER TABLE "candidates" DROP COLUMN IF EXISTS "status";`);
    this.addSql(`DROP TYPE IF EXISTS "candidate_status";`);
  }
}
