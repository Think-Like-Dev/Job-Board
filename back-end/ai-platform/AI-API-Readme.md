# AI Platform API

You are a Principal AI Microservice Architect and Senior Python Engineer. Your task is to implement a production-grade, asynchronous AI Microservice for an Applicant Tracking System (ATS) platform using Python 3.14+, FastAPI, SQLModel (PostgreSQL via asyncpg), PydanticAI, LangChain, and Cryptography.

Enforce strict code quality:
1. Linting & Formatting: Compliance with `ruff format` and `ruff check --fix` across every module.
2. Type Safety: Explicit type annotations throughout (PEP 484), including TypeVars and Generics where applicable.
3. Architecture: Modular, layered architecture following SOLID principles.
4. Security: Zero plain-text key exposure in memory, logs, or API responses.

### Example Project Directory Structure

```
ai_service/
├── alembic/
│   ├── versions/            # Contains all timestamped migration scripts
│   ├── env.py               # Async migration configuration file
│   └── script.py.mda        # Migration template
├── alembic.ini              # Alembic configuration file
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── ats.py           # Resume Analysis & Job Matching Endpoints
│   │   │   │   ├── providers.py     # AI Providers, Models, & Credentials (BYOK)
│   │   │   │   └── health.py        # Service Health Checks
│   │   │   └── router.py
│   ├── core/
│   │   ├── config.py                # Environment Settings (pydantic-settings)
│   │   ├── security.py              # Encryption / Decryption Utilities (AES-256)
│   │   └── exceptions.py            # Global Custom Exception Handlers
│   ├── db/
│   │   ├── session.py               # Async Engine & Session Manager
│   │   └── base.py                  # Database Metadata Import Base
│   ├── models/                      # SQLModel Relational Entities
│   │   ├── ats.py                   # ResumeAnalysis, CandidateJobMatch
│   │   └── llm_config.py            # AIProviders, AIModels, AICredentials, AIModelFailures
│   ├── schemas/                     # Pydantic Output / Request Schemas
│   │   ├── resume.py                # Extracted Resume Data Structure
│   │   ├── job_match.py             # Match Score & Skill Gap Analysis
│   │   └── credentials.py           # BYOK Requests & Responses
│   ├── services/
│   │   ├── ats_service.py           # Resume Parsing & Embedding/Matching Logic
│   │   ├── orchestrator.py          # Dynamic LLM Provider Selection & Fallback Engine
│   │   └── parser.py                # Raw PDF/Docx Extraction Pipeline
│   └── main.py                      # FastAPI App Initialization
├── pyproject.toml                   # Ruff & Dependency Config
└── Dockerfile
```

## 1. SYSTEM ARCHITECTURE & MODULE BREAKDOWN

Layer Structure:
  [HTTP Layer: FastAPI Routers]
        │
  [Service Layer: Business Logic & File Parsing]
        │
  [Orchestration Layer: BYOK Manager, Key Decryption & Provider Fallback Engine]
        │
  [Framework Layer: PydanticAI / LangChain Agents]
        │
  [Data Access Layer: SQLModel Repositories & Async Engine]

---

MODULE 1: BYOK (Bring Your Own Key) & SECURITY MANAGEMENT
--------------------------------------------------------------------------------
- Encryption: Implement AES-256-GCM symmetric encryption using `cryptography.hazmat.primitives.ciphers.aead.AESGCM`. Do not use `cryptography.fernet.Fernet` for this: Fernet is AES-128-CBC + HMAC-SHA256, not AES-256-GCM.
- Key Storage Logic:
  1. Accept raw API key string from client input.
  2. Extract last 4 characters -> store in `key_last_four`.
  3. Encrypt raw string -> store in `encrypted_api_key`.
  4. Wipe raw string from immediate memory context.
- Decryption Logic:
  - Expose a context-managed helper `get_decrypted_key(encrypted_str)` that yields the decrypted string solely inside the execution block of an LLM request, preventing memory leaks.

MODULE 2: DYNAMIC LLM ORCHESTRATOR & RESILIENCE ENGINE
--------------------------------------------------------------------------------
The core execution engine MUST support dynamic routing, key rotation, and automated fallback:

1. Provider Route Resolution:
   - Perform an optimized join query: `AIProviders` ⋈ `AIModels` ⋈ `AICredentials` where `is_active = True`.
   - Priority Order: Order candidate routes by credential/model usage metrics or creation sequence.

2. Fallback Execution Loop:
   FOR EACH (provider, model, credential) IN active_routes:
       TRY:
           a. Decrypt credential key via context manager.
           b. Instantiate the provider-specific client (PydanticAI Agent or LangChain LLM).
           c. Execute prompt with enforced Pydantic structured output schema.
           d. RETURN structured output immediately on success.
       EXCEPT (RateLimitError, AuthenticationError, APIConnectionError, TimeoutError) AS err:
           a. Log exact failure details into `AIModelFailures` table:
              - credential_id
              - model_id
              - error_type (class name)
              - error_message (sanitized string, ensuring key isn't printed)
           b. CONTINUALLY fall back to the NEXT active route.
       
   IF ALL ROUTES FAIL:
       RAISE AllProvidersExhaustedException("Every active AI provider/credential failed to produce a result.")

MODULE 3: ATS RESUME EXTRACTION & MATCHING ENGINE
--------------------------------------------------------------------------------
1. Text Extraction Pipeline:
   - Accept PDF or DOCX file input via `UploadFile`.
   - Extract raw text using non-blocking asynchronous document processing libraries (`pypdf`, `python-docx`).
2. Resume Parsing (`/ats/parse-resume`):
   - Pass raw text to `LLMOrchestrator` enforcing structured Pydantic output (`ResumeExtractionSchema`).
   - Save result to database table `resume_analysis`:
     - `extracted_data`: JSON field containing parsed skills, experience, education, personal info.
     - `summary`: High-level candidate executive summary.
3. Candidate-Job Matching (`/ats/match-candidate`):
   - Input: Job Description (text) + Parsed Resume / Candidate ID.
   - Pass both context windows to `LLMOrchestrator` enforcing `JobMatchEvaluationSchema`.
   - Save result to database table `candidate_job_match`:
     - `score`: Decimal (0.0 to 100.0).
     - `matching_skills`: JSON array of overlapping skills.
     - `missing_skills`: JSON array of skills required by JD but missing in Resume.
     - `ai_summary`: Analysis of fit, strengths, and missing qualifications.

## 2. DATABASE  MODEL 

### 2.1 DATABASE MODEL REFERENCE (using SQLModel lib)
Ensure SQLModel entities map to PostgreSQL schema using appropriate dialect types:

- `ResumeAnalysis` (`resume_analysis`)
  - id: UUID (PK)
  - resume_id: UUID (Indexed)
  - extracted_data: JSON / Dict
  - summary: TEXT
  - created_at: TIMESTAMP

- `CandidateJobMatch` (`candidate_job_match`)
  - id: UUID (PK)
  - application_id: UUID (Indexed)
  - score: Decimal
  - matching_skills: JSON / List[str]
  - missing_skills: JSON / List[str]
  - ai_summary: TEXT
  - created_at: TIMESTAMP

- `AIProviders` (`ai_providers`)
  - id: UUID (PK)
  - name: VARCHAR
  - code: VARCHAR (Unique, e.g., 'openai', 'anthropic', 'google')
  - is_active: BOOLEAN
  - created_at, updated_at: TIMESTAMP

- `AIModels` (`ai_models`)
  - id: UUID (PK)
  - provider_id: FK -> ai_providers.id
  - model_name: VARCHAR (e.g., 'gpt-4o', 'claude-3-5-sonnet-20240620')
  - display_name: VARCHAR
  - is_active: BOOLEAN
  - released_at, deprecated_at: TIMESTAMP

- `AICredentials` (`ai_credentials`)
  - id: UUID (PK)
  - provider_id: FK -> ai_providers.id
  - encrypted_api_key: TEXT
  - key_last_four: VARCHAR(4)
  - is_active: BOOLEAN

- `AIModelFailures` (`ai_model_failures`)
  - id: UUID (PK)
  - credential_id: FK -> ai_credentials.id
  - model_id: FK -> ai_models.id
  - error_type: VARCHAR
  - error_message: TEXT
  - created_at: TIMESTAMP

### 2.2 SCHEMA MANAGEMENT AND MIGRATION (using Alembic)

MIGRATION ARCHITECTURE & GUIDELINES:
   - Metadata Centralization:
     Implement `app/db/base.py` which explicitly imports `SQLModel` and ALL model 
     classes (`ResumeAnalysis`, `CandidateJobMatch`, `AIProviders`, `AIModels`, 
     `AICredentials`, `AIModelFailures`). Pass `SQLModel.metadata` into Alembic's 
     `env.py` (`target_metadata = SQLModel.metadata`).
   
   - Async Migration Pipeline (`env.py`):
     Configure Alembic to use `asyncpg` for autogenerated migrations. `env.py` 
     must use `asyncio.run()` to execute migrations using `connectable.connect()` 
     and `connection.run_sync(run_migrations)`.

   - Dynamic Environment Overrides:
     `alembic.ini` must read `DATABASE_URL` dynamically from `app.core.config.settings` 
     or environment variables inside `env.py` rather than hardcoding credentials in `alembic.ini`.

   - Autogeneration Workflow Requirements:
     Provide standard CLI workflows in documentation:
     - Initialize revision: `alembic revision --autogenerate -m "migration_name"`
     - Apply migrations: `alembic upgrade head`
     - Rollback migration: `alembic downgrade -1`

## 3. STRUCTURED OUTPUT SCHEMAS (Pydantic v2)


Ensure all LLM outputs enforce absolute schema compliance using Pydantic:

SCHEMA: ResumeExtractionSchema
  - first_name: Optional[str]
  - last_name: Optional[str]
  - email: Optional[str]
  - phone: Optional[str]
  - skills: List[str]
  - experience: List[Dict[company, role, start_date, end_date, achievements]]
  - education: List[Dict[institution, degree, graduation_year]]
  - executive_summary: str

SCHEMA: JobMatchEvaluationSchema
  - score: Decimal (Value restricted between 0.00 and 100.00)
  - matching_skills: List[str]
  - missing_skills: List[str]
  - fit_analysis: str (Comprehensive narrative explaining score calculation)

## 4. REST API ENDPOINT SPECIFICATIONS


Provide FastAPI endpoints matching standard OpenAPI patterns:

1. Credential Management (BYOK):
   - `POST /api/v1/providers/credentials`: Save new provider key (Encrypts key, extracts last 4 digits).
   - `GET /api/v1/providers/credentials`: Retrieve active user credentials (Return metadata and `key_last_four` only. NEVER return encrypted string).
   - `PATCH /api/v1/providers/credentials/{id}/toggle`: Enable/disable specific API key.

2. ATS Operations:
   - `POST /api/v1/ats/resumes/parse`: Multi-part form file upload (`.pdf`/`.docx`). Returns parsed structure and DB `resume_analysis.id`.
   - `POST /api/v1/ats/matches/evaluate`: Body contains `resume_analysis_id` and `job_description_text`. Returns evaluation and DB `candidate_job_match.id`.

3. Operational Monitoring:
   - `GET /api/v1/system/failures`: Audit log listing historical provider model errors from `ai_model_failures`.

## 5. NON-FUNCTIONAL REQUIREMENTS & CONSTRAINTS

1. Ruff Rules: Standardized code formatting. Run `ruff format` and `ruff check --fix` prior to completion.
2. DB Transactions: Use `AsyncSession` with atomic explicit transaction management (`async with session.begin():`).
3. Security: Scrub encrypted and raw API key variables from exception tracebacks and logs.
4. Production Resilience: Wrap LLM model instantiations with timeout limits (e.g., 30s network timeout per attempt).
5. Avoid Writing unit tests or pytests . we shall do that in later phase.
6. Follow Software Principles like `SOLID` , `KISS` , `DRY` and generator function software pattern for regular CRUD operations.
7. API and schemas should be swagger documented.
8. All of the above are just guidelines, you can make changes as you see to fit the scope and database schema structure.
9. I prefer `uv` package for environment management and package management using `pyproject.toml` file.