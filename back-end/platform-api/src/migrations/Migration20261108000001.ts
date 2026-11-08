import { Migration } from '@mikro-orm/migrations';

/**
 * Aligns the Phase 2.5 string columns with MikroORM's default varchar(255)
 * mapping. The initial migration used unbounded `varchar`, which is valid in
 * PostgreSQL but shows up as schema drift. `credential_url` intentionally
 * becomes `text` because credential URLs can exceed 255 characters.
 */
export class Migration20261108000001 extends Migration {
  override up(): void {
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "current_location" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "address" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "city" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "state" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "country" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "postal_code" TYPE varchar(255);`,
    );

    this.addSql(
      `ALTER TABLE "candidate_experience" ALTER COLUMN "company_name" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_experience" ALTER COLUMN "job_title" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_experience" ALTER COLUMN "salary" TYPE varchar(255);`,
    );

    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "institution" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "degree" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "field_of_study" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "grade" TYPE varchar(255);`,
    );

    this.addSql(`ALTER TABLE "skills" ALTER COLUMN "name" TYPE varchar(255);`);
    this.addSql(
      `ALTER TABLE "skills" ALTER COLUMN "normalized_name" TYPE varchar(255);`,
    );

    this.addSql(
      `ALTER TABLE "candidate_certifications" ALTER COLUMN "title" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_certifications" ALTER COLUMN "issuer" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_certifications" ALTER COLUMN "credential_url" TYPE text;`,
    );
  }

  override down(): void {
    this.addSql(
      `ALTER TABLE "candidate_certifications" ALTER COLUMN "credential_url" TYPE varchar(255);`,
    );
    this.addSql(
      `ALTER TABLE "candidate_certifications" ALTER COLUMN "issuer" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_certifications" ALTER COLUMN "title" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "skills" ALTER COLUMN "normalized_name" TYPE varchar;`,
    );
    this.addSql(`ALTER TABLE "skills" ALTER COLUMN "name" TYPE varchar;`);
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "grade" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "field_of_study" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "degree" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_education" ALTER COLUMN "institution" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_experience" ALTER COLUMN "salary" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_experience" ALTER COLUMN "job_title" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidate_experience" ALTER COLUMN "company_name" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "postal_code" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "country" TYPE varchar;`,
    );
    this.addSql(`ALTER TABLE "candidates" ALTER COLUMN "state" TYPE varchar;`);
    this.addSql(`ALTER TABLE "candidates" ALTER COLUMN "city" TYPE varchar;`);
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "address" TYPE varchar;`,
    );
    this.addSql(
      `ALTER TABLE "candidates" ALTER COLUMN "current_location" TYPE varchar;`,
    );
  }
}
