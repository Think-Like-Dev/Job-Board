-- ==========================================
-- ATS Data 
-- ==========================================

CREATE TABLE IF NOT EXISTS "resume_analysis" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"resume_id" UUID,
	"extracted_data" JSON,
	"summary" TEXT,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);

CREATE TABLE IF NOT EXISTS "candidate_job_match" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" UUID,
	"score" DECIMAL,
	"matching_skills" JSON,
	"missing_skills" JSON,
	"ai_summary" TEXT,
	"created_at" TIMESTAMP,
	PRIMARY KEY("id")
);



-- ==========================================
-- AI PROVIDERS
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_providers (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL UNIQUE,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- SUPPORTED MODELS
-- Managed by your platform
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_models (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "model_name" VARCHAR NOT NULL,
    "display_name" VARCHAR,
    "is_active" BOOLEAN DEFAULT true,
    "released_at" TIMESTAMP,
    "deprecated_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_models_provider FOREIGN KEY("provider_id") REFERENCES ai_providers("id")
);


-- ==========================================
-- USER PROVIDED API KEYS (BYOK)
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_credentials (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "encrypted_api_key" TEXT NOT NULL,
    "key_last_four" VARCHAR(4),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_credentials_provider FOREIGN KEY("provider_id") REFERENCES ai_providers("id")
);


-- ==========================================
-- MODEL FAILURE / EXHAUSTION LOG
-- Only operational history
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_model_failures (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "credential_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "error_type" VARCHAR,
    "error_message" TEXT,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_model_failures_credentials FOREIGN KEY("credential_id") REFERENCES ai_credentials("id"),
    CONSTRAINT fk_ai_model_failures_models FOREIGN KEY("model_id") REFERENCES ai_models("id")
);
