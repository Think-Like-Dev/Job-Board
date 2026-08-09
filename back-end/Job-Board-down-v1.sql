DROP TABLE "users";
DROP TABLE "sessions";
DROP TABLE "files";
DROP TABLE "candidates";
DROP TABLE "candidate_addresses";
DROP TABLE "candidate_resumes";
DROP TABLE "candidate_education";
DROP TABLE "candidate_experience";
DROP TABLE "skills";
DROP TABLE "candidate_skills";
DROP TABLE "candidate_certifications";
DROP TABLE "jobs";
DROP TABLE "job_skills";
DROP TABLE "job_application_questions";
DROP TABLE "question_options";
DROP TABLE "applications";
DROP TABLE "application_answers";
DROP TABLE "application_status_history";
DROP TABLE "interview_rounds";
DROP TABLE "interviews";
DROP TABLE "interviewers";
DROP TABLE "interview_feedback";
DROP TABLE "offers";
DROP TABLE "email_templates";
DROP TABLE "email_logs";
DROP TABLE "candidate_bookmarks";
DROP TABLE "notifications";
DROP TABLE "resume_analysis";
DROP TABLE "candidate_job_match";
DROP TABLE "activity_logs";

ALTER TABLE "sessions" DROP CONSTRAINT "fk_users_id_sessions";

ALTER TABLE "candidates" DROP CONSTRAINT "fk_files_id_candidates";

ALTER TABLE "candidate_addresses" DROP CONSTRAINT "fk_candidates_id_candidate_addresses";

ALTER TABLE "candidate_resumes" DROP CONSTRAINT "fk_candidates_id_candidate_resumes";
ALTER TABLE "candidate_resumes" DROP CONSTRAINT "fk_files_id_candidate_resumes";

ALTER TABLE "candidate_education" DROP CONSTRAINT "fk_candidates_id_candidate_education";

ALTER TABLE "candidate_experience" DROP CONSTRAINT "fk_candidates_id_candidate_experience";

ALTER TABLE "candidate_skills" DROP CONSTRAINT "fk_candidates_id_candidate_skills";
ALTER TABLE "candidate_skills" DROP CONSTRAINT "fk_skills_id_candidate_skills";

ALTER TABLE "candidate_certifications" DROP CONSTRAINT "fk_candidates_id_candidate_certifications";

ALTER TABLE "jobs" DROP CONSTRAINT "fk_users_id_jobs";

ALTER TABLE "job_skills" DROP CONSTRAINT "fk_jobs_id_job_skills";
ALTER TABLE "job_skills" DROP CONSTRAINT "fk_skills_id_job_skills";

ALTER TABLE "job_application_questions" DROP CONSTRAINT "fk_jobs_id_job_application_questions";

ALTER TABLE "question_options" DROP CONSTRAINT "fk_job_application_questions_id_question_options";

ALTER TABLE "applications" DROP CONSTRAINT "fk_candidates_id_applications";
ALTER TABLE "applications" DROP CONSTRAINT "fk_jobs_id_applications";
ALTER TABLE "applications" DROP CONSTRAINT "fk_candidate_resumes_id_applications";

ALTER TABLE "application_answers" DROP CONSTRAINT "fk_applications_id_application_answers";
ALTER TABLE "application_answers" DROP CONSTRAINT "fk_job_application_questions_id_application_answers";

ALTER TABLE "application_status_history" DROP CONSTRAINT "fk_applications_id_application_status_history";
ALTER TABLE "application_status_history" DROP CONSTRAINT "fk_users_id_application_status_history";

ALTER TABLE "interview_rounds" DROP CONSTRAINT "fk_jobs_id_interview_rounds";

ALTER TABLE "interviews" DROP CONSTRAINT "fk_applications_id_interviews";
ALTER TABLE "interviews" DROP CONSTRAINT "fk_interview_rounds_id_interviews";

ALTER TABLE "interviewers" DROP CONSTRAINT "fk_interviews_id_interviewers";
ALTER TABLE "interviewers" DROP CONSTRAINT "fk_users_id_interviewers";

ALTER TABLE "interview_feedback" DROP CONSTRAINT "fk_interviews_id_interview_feedback";
ALTER TABLE "interview_feedback" DROP CONSTRAINT "fk_users_id_interview_feedback";

ALTER TABLE "offers" DROP CONSTRAINT "fk_applications_id_offers";
ALTER TABLE "offers" DROP CONSTRAINT "fk_files_id_offers";

ALTER TABLE "email_logs" DROP CONSTRAINT "fk_email_templates_id_email_logs";
ALTER TABLE "email_logs" DROP CONSTRAINT "fk_applications_id_email_logs";

ALTER TABLE "candidate_bookmarks" DROP CONSTRAINT "fk_candidates_id_candidate_bookmarks";
ALTER TABLE "candidate_bookmarks" DROP CONSTRAINT "fk_jobs_id_candidate_bookmarks";

ALTER TABLE "notifications" DROP CONSTRAINT "fk_candidates_id_notifications";

ALTER TABLE "resume_analysis" DROP CONSTRAINT "fk_candidate_resumes_id_resume_analysis";

ALTER TABLE "candidate_job_match" DROP CONSTRAINT "fk_applications_id_candidate_job_match";

ALTER TABLE "activity_logs" DROP CONSTRAINT "fk_users_id_activity_logs";

DROP TYPE "user_role";
DROP TYPE "job_status";
DROP TYPE "employment_type";
DROP TYPE "application_status";
DROP TYPE "interview_mode";
DROP TYPE "interview_status";
DROP TYPE "offer_status";
DROP TYPE "question_type";
DROP TYPE "email_status";
DROP TYPE "file_type";