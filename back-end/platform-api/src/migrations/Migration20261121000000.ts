import { Migration } from '@mikro-orm/migrations';

/**
 * Invitations and user lifecycle.
 *
 * A user is created as `INVITED` with an invitation token (hash only) and no
 * password; onboarding flips it to `ACTIVE`. Existing rows are `ACTIVE`.
 * `phone`/`job_title` and the name parts are collected during onboarding.
 */
export class Migration20261121000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "user_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "job_title" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "user_status" NOT NULL DEFAULT 'ACTIVE';`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_token_hash" varchar(255) NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_expires_at" timestamptz NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invited_by" uuid NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invited_at" timestamptz NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_send_count" integer NOT NULL DEFAULT 0;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_invite_sent_at" timestamptz NULL;`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarded_at" timestamptz NULL;`,
    );

    this.addSql(
      `ALTER TABLE "users" ADD CONSTRAINT "fk_users_id_invited_by" FOREIGN KEY ("invited_by") REFERENCES "users" ("id") ON UPDATE NO ACTION ON DELETE SET NULL;`,
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "users_role_index" ON "users" ("role");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "users_status_index" ON "users" ("status");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "users_invite_token_hash_index" ON "users" ("invite_token_hash");`,
    );
  }

  override down(): void {
    this.addSql(`DROP INDEX IF EXISTS "users_invite_token_hash_index";`);
    this.addSql(`DROP INDEX IF EXISTS "users_status_index";`);
    this.addSql(`DROP INDEX IF EXISTS "users_role_index";`);

    this.addSql(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_id_invited_by";`,
    );

    const columns = [
      'first_name',
      'last_name',
      'phone',
      'job_title',
      'status',
      'invite_token_hash',
      'invite_expires_at',
      'invited_by',
      'invited_at',
      'invite_send_count',
      'last_invite_sent_at',
      'onboarded_at',
    ];
    for (const column of columns) {
      this.addSql(`ALTER TABLE "users" DROP COLUMN IF EXISTS "${column}";`);
    }

    this.addSql(`DROP TYPE IF EXISTS "user_status";`);
  }
}
