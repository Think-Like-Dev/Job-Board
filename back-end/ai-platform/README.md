# AI Platform API

Async FastAPI service for ATS resume parsing, hybrid matching, and scoring.
Owns the `job_board_ai_ats` database and never reads the core API's database.

## Local development

Requires [uv](https://docs.astral.sh/uv/), Python 3.14, and a Postgres 18
instance with the `pgvector` extension available.

```sh
cp .env.example .env          # fill in DATABASE_* and AI_* values
uv sync
uv run alembic upgrade head
uv run python -m app.scripts.seed_catalog
uv run uvicorn app.main:app --reload
```

- Swagger UI: <http://localhost:8000/docs>
- Liveness: <http://localhost:8000/api/v1/health>
- Readiness (DB): <http://localhost:8000/api/v1/health/ready>

## API

All routes except health require `X-Internal-Token: $AI_INTERNAL_TOKEN`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/providers` | Provider + model catalog |
| `GET` | `/api/v1/providers/credentials` | Credential metadata (never keys) |
| `POST` | `/api/v1/providers/credentials` | Store an encrypted provider key |
| `PATCH` | `/api/v1/providers/credentials/{id}/toggle` | Enable/disable a key |
| `POST` | `/api/v1/ats/resumes/parse` | Parse a PDF/DOCX, cached by SHA-256 |
| `POST` | `/api/v1/ats/matches/evaluate` | Deterministic score + LLM assessment |
| `GET` | `/api/v1/system/failures` | Recent provider/model failures |

Resume and job-description extractions are cached by SHA-256 plus an
`extraction_version`; bump `EXTRACTION_VERSION` in `app/core/constants.py` when
a prompt or schema changes. The numeric score is deterministic Python. Semantic
similarity needs an OpenAI key; without one, the remaining components are
re-weighted and the match still returns (with `semantic = 0`).

`POST /api/v1/ats/resumes/parse` accepts an optional `resume_file_id` form
field. Provider fallback runs within `AI_MAX_FALLBACK_SECONDS` and stops
retrying a credential after an authentication/permission error.

## Quality

```sh
uv run ruff format .
uv run ruff check --fix .
```

Database migrations live in `alembic/versions/`. The LangGraph pipeline is
`app/graphs/resume_scoring_graph.py`; it is built but not wired to RabbitMQ yet.
