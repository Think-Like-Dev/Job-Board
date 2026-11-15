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
similarity needs an embedding provider; without one, the remaining components
are re-weighted and the match still returns (with `semantic = 0`).

`POST /api/v1/ats/resumes/parse` accepts an optional `resume_file_id` form
field. Provider fallback runs within `AI_MAX_FALLBACK_SECONDS` and stops
retrying a credential after an authentication/permission error.

## Models

| Purpose | Model | Where it runs |
| --- | --- | --- |
| Embeddings | `multilingual-e5-small` (384 dimensions, 100 languages) | an OpenAI-compatible server you run (`AI_EMBEDDING_BASE_URL`), or in-process later |
| Chat / extraction | any OpenAI-compatible model server you run (`AI_LOCAL_LLM_BASE_URL`) | no API key needed |

Both are **configuration**: the model name and the vector size come from
`AI_LOCAL_EMBEDDING_MODEL` and `AI_EMBEDDING_DIM`. The vector size is also the
column type in Postgres, so changing it needs

1. an Alembic migration that alters the column
   (`ALTER COLUMN ... TYPE vector(N)`) and rebuilds the HNSW index, and
2. `uv run python -m app.scripts.convert_embeddings` to re-embed the stored
   texts — a vector cannot be converted between models or sizes, it has to be
   computed again.

The model itself is not downloaded automatically: point the service at a server
you run, or add the download step to the image build.

## OCR languages (Tesseract)

Scanned pages — a page with no selectable text — are read with Tesseract.
**Only the English language pack is installed in the image.**

To support another language:

1. add the pack to both `Dockerfile` and `Dockerfile.dev`:

   ```dockerfile
   RUN apt-get update \
       && apt-get install -y --no-install-recommends \
           tesseract-ocr \
           tesseract-ocr-eng \
           tesseract-ocr-tam \
       && rm -rf /var/lib/apt/lists/*
   ```

2. list the languages in `AI_OCR_LANGUAGES` (Tesseract syntax, `+` separated):

   ```sh
   AI_OCR_LANGUAGES=eng+tam
   ```

3. rebuild the image: `./dk build:dev ai`.

Running many packs at once slows recognition down and can reduce accuracy, so
install only the languages you need. The available packs are listed at
<https://github.com/tesseract-ocr/tesseract>.

When Tesseract is not installed, a scanned page is reported as unreadable and
the run falls back to the candidate's profile data.

## Quality

```sh
uv run ruff format .
uv run ruff check --fix .
```

Database migrations live in `alembic/versions/`. The LangGraph pipeline is
`app/graphs/resume_scoring_graph.py`; the RabbitMQ consumer that runs it lives
in `app/workers/scoring_worker.py` and starts with the FastAPI process.
