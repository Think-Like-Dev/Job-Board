import { Migration } from '@mikro-orm/migrations';

/**
 * File ownership: every upload records the authenticated principal that
 * created it. `owner_type` mirrors `SessionPayload.principalType`, while
 * `owner_id` holds either a candidate or an internal user UUID.
 *
 * Ownership is polymorphic (candidate OR user), so a database foreign key
 * cannot express it without a trigger. The application always writes both
 * columns from the session; the check constraint only guarantees the pair is
 * complete.
 */
export class Migration20261107000001 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "file_owner_type" AS ENUM ('CANDIDATE', 'USER');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "owner_type" "file_owner_type" NULL;`,
    );
    this.addSql(
      `ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "owner_id" uuid NULL;`,
    );

    this.addSql(`
        DO $$
        BEGIN
          ALTER TABLE "files"
            ADD CONSTRAINT "files_owner_pair_check"
            CHECK (("owner_type" IS NULL) = ("owner_id" IS NULL));
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "files_owner_index" ON "files" ("owner_type", "owner_id");`,
    );
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS "files_owner_index";`);
    this.addSql(
      `ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_owner_pair_check";`,
    );
    this.addSql(`ALTER TABLE "files" DROP COLUMN IF EXISTS "owner_id";`);
    this.addSql(`ALTER TABLE "files" DROP COLUMN IF EXISTS "owner_type";`);
    this.addSql(`DROP TYPE IF EXISTS "file_owner_type" CASCADE;`);
  }
}
