import { Migration } from '@mikro-orm/migrations';

/**
 * Initial schema for the modules that exist today: users, candidates, files.
 *
 * The SQL mirrors the entity metadata in `*.schema.ts`, including native
 * PostgreSQL enums (`user_role`, `file_type`), UUID defaults, unique email
 * constraints, and the candidates -> files profile-image FK. It intentionally
 * does not create tables for planned modules that have no entities yet.
 */
export class Migration20261019000000 extends Migration {
  override up(): void {
    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "file_type" AS ENUM (
            'RESUME',
            'COVER_LETTER',
            'OFFER_LETTER',
            'PROFILE_IMAGE',
            'OTHER'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(`
        DO $$
        BEGIN
          CREATE TYPE "user_role" AS ENUM (
            'ADMIN',
            'RECRUITER',
            'HIRING_MANAGER'
          );
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "files" ("id" uuid not null default gen_random_uuid(), "file_type" "file_type" null, "filename" varchar(255) null, "mime_type" varchar(255) null, "size" bigint null, "storage_path" varchar(255) null, "created_at" timestamptz null, primary key ("id"));`,
    );

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "candidates" ("id" uuid not null default gen_random_uuid(), "email" varchar(255) not null, "first_name" varchar(255) null, "last_name" varchar(255) null, "phone" varchar(255) null, "profile_image_file_id" uuid null, "linkedin_url" varchar(255) null, "portfolio_url" varchar(255) null, "created_at" timestamptz null, "updated_at" timestamptz null, primary key ("id"));`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ADD CONSTRAINT "candidates_email_unique" UNIQUE ("email");`,
    );

    this.addSql(
      `CREATE TABLE IF NOT EXISTS "users" ("id" uuid not null default gen_random_uuid(), "name" varchar(255) null, "email" varchar(255) not null, "password_hash" varchar(255) null, "role" "user_role" null, "is_active" boolean not null default true, "created_at" timestamptz null, "updated_at" timestamptz null, primary key ("id"));`,
    );
    this.addSql(
      `ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE ("email");`,
    );

    this.addSql(
      `ALTER TABLE "candidates" ADD CONSTRAINT "fk_files_id_candidates" FOREIGN KEY ("profile_image_file_id") REFERENCES "files" ("id") ON UPDATE NO ACTION ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE;`,
    );
  }

  override down(): void {
    // Drop the dependent table before the table it references.
    this.addSql(`DROP TABLE IF EXISTS "candidates" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "users" CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS "files" CASCADE;`);
    this.addSql(`DROP TYPE IF EXISTS "user_role" CASCADE;`);
    this.addSql(`DROP TYPE IF EXISTS "file_type" CASCADE;`);
  }
}
