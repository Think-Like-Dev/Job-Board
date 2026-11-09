# AI Platform API

You are a Principal AI Microservice Architect and Senior Python Engineer. Your task is to implement a production-grade, asynchronous AI Microservice for an Applicant Tracking System (ATS) platform using Python 3.14+, FastAPI, SQLModel (PostgreSQL + pgvector via asyncpg), Pydantic v2 (pure type-safety & structured schemas), LangGraph (state-graph agent workflows & step navigation), RabbitMQ (aio-pika), and Cryptography (AES-256-GCM).

Enforce strict code quality:
1. Linting & Formatting: Compliance with `ruff format` and `ruff check --fix` across every module.
2. Type Safety: Explicit type annotations throughout (PEP 484), including TypeVars and Generics where applicable.
3. Architecture: Modular, layered, event-driven state-graph architecture following SOLID principles.
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
│   │   │   │   ├── ats.py           # Resume Analysis & Job Matching Endpoints (Test / Admin)
│   │   │   │   ├── providers.py     # AI Providers, Models, & Credentials (BYOK)
│   │   │   │   └── health.py        # Service Health Checks
│   │   │   └── router.py
│   ├── core/
│   │   ├── config.py                # Environment Settings (pydantic-settings)
│   │   ├── security.py              # Encryption / Decryption Utilities (AES-256-GCM)
│   │   ├── rabbitmq.py              # RabbitMQ Connection & Channel Manager (aio-pika)
│   │   └── exceptions.py            # Global Custom Exception Handlers
│   ├── db/
│   │   ├── session.py               # Async Engine & Session Manager
│   │   └── base.py                  # Database Metadata Import Base
│   ├── graphs/                      # LangGraph StateGraph Definitions
│   │   ├── state.py                 # Pydantic GraphState Schema (Pure Pydantic v2)
│   │   ├── nodes.py                 # Graph Nodes (Extract, OCR Fallback, Embed, Score)
│   │   └── resume_scoring_graph.py  # Compiled StateGraph with Conditional Edges
│   ├── models/                      # SQLModel Relational Entities (Postgres + pgvector)
│   │   ├── ats.py                   # ResumeAnalysis, CandidateJobMatch, ResumeEmbedding, JobEmbedding
│   │   └── llm_config.py            # AIProviders, AIModels, AICredentials, AIModelFailures
│   ├── schemas/                     # Pydantic Output / Request Schemas (Pure Pydantic v2)
│   │   ├── resume.py                # Extracted Resume Data Structure
│   │   ├── job_match.py             # Match Score & Skill Gap Analysis
│   │   └── credentials.py           # BYOK Requests & Responses
│   ├── services/
│   │   ├── orchestrator.py          # Dynamic LLM Provider Selection & Fallback Engine
│   │   ├── parser.py                # Raw PDF/Docx Extraction Pipeline (PyMuPDF / python-docx)
│   │   ├── embedding_service.py     # Vector Generation & pgvector Similarity Search
│   │   └── storage_client.py        # Garage S3 Stream Reader
│   ├── workers/                     # Async RabbitMQ Event Consumers
│   │   ├── scoring_worker.py        # Listens to 'application.submitted' -> Invokes LangGraph
│   │   └── email_worker.py          # Listens to 'email.send' -> Formats & Dispatches Notifications
│   └── main.py                      # FastAPI App Initialization & Worker Startup
├── pyproject.toml                   # Ruff & Dependency Config
└── Dockerfile
```

## 1. SYSTEM ARCHITECTURE & MODULE BREAKDOWN

Layer Structure:
  [Event Layer: RabbitMQ Consumers / Workers (aio-pika)]
        │
  [HTTP Layer: FastAPI Routers (BYOK Admin & Direct Operations)]
        │
  [State-Graph Layer: LangGraph Workflows with Conditional Routing & Checkpoints]
        │
  [Schema & Validation Layer: Pure Pydantic v2 BaseModels & Structured Outputs]
        │
  [Orchestration Layer: BYOK Manager, Key Decryption & Provider Fallback Engine]
        │
  [Data Access Layer: SQLModel Repositories, Asyncpg Engine & PostgreSQL + pgvector]

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
           b. Instantiate the provider-specific LLM client with structured output enforcement (Pydantic v2 schema via `.with_structured_output()`).
           c. Execute node / prompt within the LangGraph workflow.
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

MODULE 3: ATS RESUME EXTRACTION & HYBRID MATCHING GRAPH
--------------------------------------------------------------------------------
1. Text Extraction Pipeline:
   - Accept PDF or DOCX file input via `UploadFile` (or streamed from Garage S3).
   - Extract raw text using non-blocking asynchronous document processing libraries (`PyMuPDF`/`fitz`, `python-docx`).
2. LangGraph Resume Scoring Workflow (`resume_scoring_graph`):
   - **Graph State**: Typed Pydantic v2 `GraphState` containing candidate info, raw text, structured profile, embeddings, scores, and evaluation notes.
   - **Step 1: Text Inspection & OCR Fallback (Conditional Edge)**:
     - Check if extracted text is legible/sufficient.
     - *Conditional Routing*: If the document is unreadable / non-OCR friendly, route to the `profile_fallback_node` to populate the state from the candidate's existing platform profile snapshot; otherwise route to `llm_extraction_node`.
   - **Step 2: Resume Parsing & Deduplication (`llm_extraction_node`)**:
     - Parse once per unique resume file (tracked by `file_id` or SHA-256 hash).
     - Extract structured entities enforcing Pydantic v2 `ResumeExtractionSchema`.
     - Save parsed structure to database table `resume_analysis`:
       - `extracted_data`: JSON field containing parsed skills, experience, education, personal info.
       - `summary`: High-level candidate executive summary.
   - **Step 3: Vector Generation (`embedding_node`)**:
     - Generate dense vector embeddings for resume sections and store in `resume_embeddings` (`Vector(1536)`).
     - Job embeddings are pre-computed and stored in `job_embeddings` upon job publication.
   - **Step 4: Deterministic Scoring (`deterministic_scoring_node`)**:
     - Calculate hard skill overlap (must-have vs. nice-to-have).
     - Calculate tenure and experience alignment with recency decay.
     - Compute cosine similarity via `pgvector`.
   - **Step 5: LLM Qualitative Evaluation (`evaluation_node`)**:
     - Run prompt enforcing Pydantic v2 `JobMatchEvaluationSchema` to generate pros, risks, and tailored interview questions.
     - Save final evaluation to database table `candidate_job_match`:
       - `score`: Decimal (0.0 to 100.0) reflecting the hybrid score.
       - `matching_skills`: JSON array of overlapping skills.
       - `missing_skills`: JSON array of skills required by JD but missing in Resume.
       - `ai_summary`: Analysis of fit, strengths, and missing qualifications.

MODULE 4: ASYNCHRONOUS RABBITMQ EVENT ARCHITECTURE
--------------------------------------------------------------------------------
The AI service integrates with the core NestJS API using RabbitMQ as an asynchronous message bus:

1. Topic Exchange: `ats.events`
   - Dead Letter Exchange (DLX): `ats.dlx` with Dead Letter Queue `ats.dlq`.
2. Core Queues & Routing Keys:
   - Queue `ai.resume.scoring` bound to routing key: `application.submitted`
     - Payload: `{ application_id, candidate_id, job_id, resume_file_id }`
     - Processing Flow:
       a. Downloads file stream from Garage S3 / Core API via `storage_client`.
       b. Checks if resume is already parsed (cache hit by `resume_file_id`); if not, invokes `resume_scoring_graph` to run text extraction, OCR fallback routing, and Pydantic parsing.
       c. Computes embedding, stores in `resume_embeddings`.
       d. Evaluates hybrid match against the target job requirements and persists to `candidate_job_match`.
       e. Publishes completion event `scoring.completed` to notify recruiter frontend (via SSE) and trigger subsequent workflows.
   - Queue `notifications.email` bound to routing keys: `email.*` (e.g., `email.send`, `email.application.received`)
     - Payload: `{ to, template_id, subject, variables, trigger_source }`
     - Processing Flow: Dispatches templated emails with retry, exponential backoff, and dead-letter routing upon repeated failure.

## 2. DATABASE MODEL 

### 2.1 DATABASE MODEL REFERENCE (using SQLModel lib + pgvector)
Ensure SQLModel entities map to PostgreSQL schema using appropriate dialect types and `pgvector.sqlalchemy.Vector`:

- `ResumeAnalysis` (`resume_analysis`)
  - id: UUID (PK)
  - resume_id: UUID (Indexed)
  - extracted_data: JSON / Dict
  - summary: TEXT
  - created_at: TIMESTAMP

- `ResumeEmbedding` (`resume_embeddings`)
  - id: UUID (PK)
  - resume_id: UUID (Indexed, FK -> resume_analysis.resume_id)
  - embedding: Vector(1536)
  - created_at: TIMESTAMP

- `JobEmbedding` (`job_embeddings`)
  - id: UUID (PK)
  - job_id: UUID (Indexed)
  - embedding: Vector(1536)
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

## Startup Command

```sh
cp .env.example .env   # set DATABASE_*, AI_ENCRYPTION_KEY, AI_INTERNAL_TOKEN
uv run alembic upgrade head
uv run python -m app.scripts.seed_catalog
uv run uvicorn app.main:app --reload
```