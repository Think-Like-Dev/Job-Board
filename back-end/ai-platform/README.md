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

Both models run **locally**, on your own machine, served by
[llama.cpp](https://github.com/ggml-org/llama.cpp). Nothing is sent to a paid
provider and no API key is needed.

| Purpose | Model | Where it runs |
| --- | --- | --- |
| Chat / extraction | a small instruct model (Qwen2.5 0.5B) | `llama-server` on port 9931 |
| Embeddings | `multilingual-e5-small` (384 dimensions, 100 languages) | `llama-server --embedding` on port 9932 |

Two processes, because `llama-server` serves either chat **or** embeddings
(`--embedding` restricts it), and they are different model files.

### Download, in order

1. **llama.cpp for Windows (CPU)** — <https://github.com/ggml-org/llama.cpp/releases>
   Take the `llama-*-bin-win-cpu-x64` zip, unzip it to `C:\Users\<you>\llama.cpp\`.
   You need `llama-server.exe` from it.
2. **The embedding model** — <https://huggingface.co/keisuke-miyako/multilingual-e5-small-gguf-q8_0>
   Download `multilingual-e5-small-Q8_0.gguf` (126 MB) and **rename it** to
   `e5-small-multilingual-q8_0.gguf` when you put it in the models folder.

   > **Do not use `cstr/multilingual-e5-small-GGUF`.** Its conversion is
   > missing the `tokenizer.ggml.model` and `tokenizer.ggml.token_type_count`
   > keys that llama.cpp needs for BERT-style models, so the server refuses
   > to load it:
   > `error loading model: bert model needs to define token type count`.
   > The `keisuke-miyako` build has them. Because Windows filenames are
   > case-insensitive, the broken `multilingual-e5-small-q8_0.gguf` and the
   > working `multilingual-e5-small-Q8_0.gguf` are the same name — that is
   > why the scripts look for `e5-small-multilingual-q8_0.gguf`.
   >
   > The Q4_K_M build (119 MB) is in the sibling repository
   > <https://huggingface.co/keisuke-miyako/multilingual-e5-small-gguf-q4_k_m>
   > and works just as well.
3. **The chat model** — <https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF>
   Download `qwen2.5-0.5b-instruct-q4_k_m.gguf` (469 MB). Alternatives:
   `gemma-3-1b-it-Q4_K_M.gguf` (769 MB) from
   <https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF>, or
   `Llama-3.2-1B-Instruct-Q4_K_M.gguf` (800 MB) from
   <https://huggingface.co/unsloth/Llama-3.2-1B-Instruct-GGUF>.

### Where to put them

Outside the repository, so they can never be committed:

```
C:\Users\<you>\models\
├── e5-small-multilingual-q8_0.gguf     (the keisuke-miyako build, renamed)
└── qwen2.5-0.5b-instruct-q4_k_m.gguf
```

### Start them

```powershell
cd back-end\ai-platform
.\scripts\start-llama-servers.ps1
```

```sh
cd back-end/ai-platform
./scripts/start-llama-servers.sh
```

The script checks that the files exist, starts both servers in the background
and prints the URLs. Logs land in `<models>\logs\`. Stop them with
`Get-Process llama-server | Stop-Process` (or `pkill -f llama-server`).

Check them:

```sh
curl http://localhost:9931/v1/models
curl http://localhost:9932/v1/embeddings -d '{"input":"hello"}'
```

The embedding response must have **384** dimensions — that is what the vector
columns are.

### Configuration

The AI service talks to them over the OpenAI-compatible API:

| Setting | Value |
| --- | --- |
| `AI_LOCAL_LLM_BASE_URL` | `http://localhost:9931/v1` (host) · `http://host.docker.internal:9931/v1` (container) |
| `AI_LOCAL_LLM_MODEL` | `local-chat` (the `--alias` of the chat server) |
| `AI_EMBEDDING_BASE_URL` | `http://localhost:9932/v1` (host) · `http://host.docker.internal:9932/v1` (container) |
| `AI_LOCAL_EMBEDDING_MODEL` | `multilingual-e5-small` |
| `AI_EMBEDDING_DIM` | `384` |

The compose overlays set the container-side URLs; the env file keeps the
host-side ones.

### Changing the embedding model

The model name and the vector size are configuration, never constants baked
into the schema. Changing the size also needs

1. an Alembic migration that alters the column
   (`ALTER COLUMN ... TYPE vector(N)`) and rebuilds the HNSW index, and
2. `uv run python -m app.scripts.convert_embeddings` to re-embed the stored
   texts — a vector cannot be converted between models or sizes, it has to be
   computed again.

E5-style models expect an asymmetric prefix: the job description is a query,
the resume passages are passages (`AI_EMBEDDING_QUERY_PREFIX`,
`AI_EMBEDDING_PASSAGE_PREFIX`).

Without a model server the pipeline still runs: it falls back to the candidate's
profile data and the recruiter's own skill list, and the result is stored as a
score-only match.

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
