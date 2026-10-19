CREATE TYPE "user_role" AS ENUM (
	'ADMIN',
	'RECRUITER',
	'HIRING_MANAGER'
);
CREATE TYPE "job_status" AS ENUM (
	'DRAFT',
	'PUBLISHED',
	'ARCHIVED',
	'CLOSED'
);
CREATE TYPE "employment_type" AS ENUM (
	'FULL_TIME',
	'PART_TIME',
	'CONTRACT',
	'INTERN'
);
CREATE TYPE "application_status" AS ENUM (
	'DRAFT',
	'APPLIED',
	'IN_REVIEW',
	'SHORTLISTED',
	'INTERVIEW',
	'OFFER_EXTENDED',
	'OFFER_ACCEPTED',
	'OFFER_REJECTED',
	'REJECTED',
	'WITHDRAWN',
	'AUTO_REJECTED'
);
CREATE TYPE "interview_mode" AS ENUM (
	'ONLINE',
	'IN_PERSON',
	'PHONE_CALL'
);
CREATE TYPE "interview_status" AS ENUM (
	'SCHEDULED',
	'COMPLETED',
	'CANCELLED',
	'RESCHEDULED'
);
CREATE TYPE "offer_status" AS ENUM (
	'PENDING',
	'ACCEPTED',
	'REJECTED',
	'EXPIRED'
);
CREATE TYPE "question_type" AS ENUM (
	'TEXT',
	'TEXTAREA',
	'RADIO',
	'CHECKBOX',
	'DROPDOWN',
	'DATE',
	'NUMBER',
	'FILE',
	'EMAIL',
	'PHONE'
);
CREATE TYPE "email_status" AS ENUM (
	'QUEUED',
	'SENT',
	'FAILED'
);
CREATE TYPE "file_type" AS ENUM (
	'RESUME',
	'COVER_LETTER',
	'OFFER_LETTER',
	'PROFILE_IMAGE',
	'OTHER'
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR,
	"email" VARCHAR NOT NULL,
	"password_hash" VARCHAR,
	"role" USER_ROLE,
	"is_active" BOOLEAN DEFAULT true,
	"created_at" TIMESTAMP,
	"updated_at" TIMESTAMP,
	PRIMARY KEY("id")
);
-- NOTE: Login sessions are NOT stored in Postgres. They live in Redis
-- (the central auth store) with a TTL, managed by the platform-api AuthService.
-- See src/modules/auth/auth.service.ts and back-end/compose.yml (redis service).
CREATE TABLE IF NOT EXISTS "files" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"file_type" FILE_TYPE,
	"filename" VARCHAR,
	"mime_type" VARCHAR,
	"size" BIGINT,
	"storage_path" VARCHAR,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "candidates" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" VARCHAR NOT NULL,
	"first_name" VARCHAR,
	"last_name" VARCHAR,
	"phone" VARCHAR,
	"profile_image_file_id" UUID,
	"linkedin_url" VARCHAR,
	"portfolio_url" VARCHAR,
	"created_at" TIMESTAMP,
	"updated_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "candidate_addresses" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"address" VARCHAR,
	"city" VARCHAR,
	"state" VARCHAR,
	"country" VARCHAR,
	"postal_code" VARCHAR,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "candidate_resumes" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"file_id" UUID,
	"version" INT,
	"parsing_status" VARCHAR,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "candidate_resumes_index_2" ON "candidate_resumes" ("candidate_id", "version");
CREATE TABLE IF NOT EXISTS "candidate_education" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"institution" VARCHAR,
	"degree" VARCHAR,
	"field_of_study" VARCHAR,
	"start_date" DATE,
	"end_date" DATE,
	"grade" VARCHAR,
	"gpa" DECIMAL,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "candidate_experience" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"company_name" VARCHAR,
	"job_title" VARCHAR,
	"start_date" DATE,
	"end_date" DATE,
	"salary" VARCHAR,
	"description" TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "skills" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "candidate_skills" (
	"candidate_id" UUID,
	"skill_id" UUID,
);
CREATE INDEX "candidate_skills_index_3" ON "candidate_skills" ("candidate_id", "skill_id");
CREATE TABLE IF NOT EXISTS "candidate_certifications" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"name" VARCHAR,
	"issuer" VARCHAR,
	"issue_date" DATE,
	"expiry_date" DATE,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" VARCHAR,
	"category" VARCHAR,
	"department" VARCHAR,
	"designation" VARCHAR,
	"employment_type" EMPLOYMENT_TYPE,
	"location" VARCHAR,
	"description" TEXT,
	"experience_required" VARCHAR,
	"salary_min" DECIMAL,
	"salary_max" DECIMAL,
	"vacancy_count" INT,
	"status" JOB_STATUS,
	"created_by" UUID,
	"created_at" TIMESTAMP,
	"updated_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "job_skills" (
	"job_id" UUID NOT NULL,
	"skill_id" UUID NOT NULL,
);
CREATE INDEX "job_skills_index_4" ON "job_skills" ("job_id", "skill_id");
CREATE TABLE IF NOT EXISTS "job_application_questions" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" UUID,
	"label" VARCHAR,
	"question_type" QUESTION_TYPE,
	"required" BOOLEAN,
	"validation_rules" JSON,
	"display_order" INT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "question_options" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"question_id" UUID,
	"option_value" VARCHAR,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "applications" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"job_id" UUID,
	"resume_id" UUID,
	"status" APPLICATION_STATUS,
	"applied_at" TIMESTAMP,
	"withdrawn_at" TIMESTAMP,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE UNIQUE INDEX "applications_index_5" ON "applications" ("candidate_id", "job_id");
CREATE TABLE IF NOT EXISTS "application_answers" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" UUID,
	"question_id" UUID,
	"answer" TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "application_status_history" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" UUID,
	"old_status" APPLICATION_STATUS,
	"new_status" APPLICATION_STATUS,
	"reason" TEXT,
	"changed_by" UUID,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "interview_rounds" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" UUID,
	"name" VARCHAR,
	"round_number" INT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "interviews" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" UUID,
	"round_id" UUID,
	"mode" INTERVIEW_MODE,
	"status" INTERVIEW_STATUS,
	"scheduled_at" TIMESTAMP,
	"meeting_link" VARCHAR,
	"location" VARCHAR,
	"instructions" TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "interviewers" (
	"interview_id" UUID NOT NULL,
	"user_id" UUID NOT NULL
);
CREATE INDEX "interviewers_index_6" ON "interviewers" ("interview_id", "user_id");
CREATE TABLE IF NOT EXISTS "interview_feedback" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"interview_id" UUID,
	"interviewer_id" UUID,
	"rating" INT,
	"comments" TEXT,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "offers" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" UUID,
	"offer_file_id" UUID,
	"salary" DECIMAL,
	"deadline" TIMESTAMP,
	"status" OFFER_STATUS,
	"accepted_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" VARCHAR,
	"category" VARCHAR,
	"subject" VARCHAR,
	"body" TEXT,
	"created_at" TIMESTAMP,
	"updated_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "email_logs" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"template_id" UUID,
	"application_id" UUID,
	"recipient" VARCHAR,
	"status" EMAIL_STATUS,
	"sent_at" TIMESTAMP,
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "candidate_bookmarks" (
	"candidate_id" UUID,
	"job_id" UUID,
	"created_at" TIMESTAMP,
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	PRIMARY KEY("id")
);
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidate_id" UUID,
	"title" VARCHAR,
	"message" TEXT,
	"read_at" TIMESTAMP,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" UUID,
	"entity_type" VARCHAR,
	"entity_id" UUID,
	"action" VARCHAR,
	"metadata" JSON,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);

ALTER TABLE "candidates" ADD CONSTRAINT "fk_files_id_candidates" FOREIGN KEY ("profile_image_file_id") REFERENCES "files" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_addresses" ADD CONSTRAINT "fk_candidates_id_candidate_addresses" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "fk_candidates_id_candidate_resumes" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_resumes" ADD CONSTRAINT "fk_files_id_candidate_resumes" FOREIGN KEY ("file_id") REFERENCES "files" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_education" ADD CONSTRAINT "fk_candidates_id_candidate_education" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_experience" ADD CONSTRAINT "fk_candidates_id_candidate_experience" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_skills" ADD CONSTRAINT "fk_candidates_id_candidate_skills" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_skills" ADD CONSTRAINT "fk_skills_id_candidate_skills" FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_certifications" ADD CONSTRAINT "fk_candidates_id_candidate_certifications" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "jobs" ADD CONSTRAINT "fk_users_id_jobs" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "job_skills" ADD CONSTRAINT "fk_jobs_id_job_skills" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "job_skills" ADD CONSTRAINT "fk_skills_id_job_skills" FOREIGN KEY ("skill_id") REFERENCES "skills" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "job_application_questions" ADD CONSTRAINT "fk_jobs_id_job_application_questions" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "question_options" ADD CONSTRAINT "fk_job_application_questions_id_question_options" FOREIGN KEY ("question_id") REFERENCES "job_application_questions" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "applications" ADD CONSTRAINT "fk_candidates_id_applications" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "applications" ADD CONSTRAINT "fk_jobs_id_applications" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "applications" ADD CONSTRAINT "fk_candidate_resumes_id_applications" FOREIGN KEY ("resume_id") REFERENCES "candidate_resumes" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "application_answers" ADD CONSTRAINT "fk_applications_id_application_answers" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "application_answers" ADD CONSTRAINT "fk_job_application_questions_id_application_answers" FOREIGN KEY ("question_id") REFERENCES "job_application_questions" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "application_status_history" ADD CONSTRAINT "fk_applications_id_application_status_history" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "application_status_history" ADD CONSTRAINT "fk_users_id_application_status_history" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interview_rounds" ADD CONSTRAINT "fk_jobs_id_interview_rounds" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interviews" ADD CONSTRAINT "fk_applications_id_interviews" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interviews" ADD CONSTRAINT "fk_interview_rounds_id_interviews" FOREIGN KEY ("round_id") REFERENCES "interview_rounds" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interviewers" ADD CONSTRAINT "fk_interviews_id_interviewers" FOREIGN KEY ("interview_id") REFERENCES "interviews" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interviewers" ADD CONSTRAINT "fk_users_id_interviewers" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interview_feedback" ADD CONSTRAINT "fk_interviews_id_interview_feedback" FOREIGN KEY ("interview_id") REFERENCES "interviews" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "interview_feedback" ADD CONSTRAINT "fk_users_id_interview_feedback" FOREIGN KEY ("interviewer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "offers" ADD CONSTRAINT "fk_applications_id_offers" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "offers" ADD CONSTRAINT "fk_files_id_offers" FOREIGN KEY ("offer_file_id") REFERENCES "files" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "email_logs" ADD CONSTRAINT "fk_email_templates_id_email_logs" FOREIGN KEY ("template_id") REFERENCES "email_templates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "email_logs" ADD CONSTRAINT "fk_applications_id_email_logs" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_bookmarks" ADD CONSTRAINT "fk_candidates_id_candidate_bookmarks" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "candidate_bookmarks" ADD CONSTRAINT "fk_jobs_id_candidate_bookmarks" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "notifications" ADD CONSTRAINT "fk_candidates_id_notifications" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "activity_logs" ADD CONSTRAINT "fk_users_id_activity_logs" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY IMMEDIATE;