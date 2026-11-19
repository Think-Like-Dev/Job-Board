# AI Platform API

Async FastAPI service for ATS resume parsing, hybrid matching, and scoring.
Owns the `job_board_ai_ats` database and never reads the core API's database.

## Local development

Requires [uv](https://docs.astral.sh/uv/), Python 3.14, and the shared env file
`back-end/env/.env.local` (created by `./dk setup`).

The service reads `../env/.env.<AI_ENVIRONMENT>` (default `local`) and then a
local `.env`, so it runs from this directory without exporting anything:

```sh
uv sync
uv run alembic upgrade head
uv run python -m app.scripts.seed_catalog
uv run uvicorn app.main:app --reload
```

Inside Docker neither file is mounted; the variables arrive from compose.
A local `.env` is only for a one-off override.

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

## Document ingestion

The pipeline in `app/services/document/` reads a resume and decides whether it
can be trusted:

```
validate -> extract -> assess -> normalise -> chunk
```

- **validate** — the extension says what the file claims to be, the content
  says what it actually is. A file that lies is rejected.
- **extract** — every page is classified on its own: selectable text goes
  through PyMuPDF4LLM (which keeps the reading order and the tables),
  image-only pages go through Tesseract. A PDF can have a text page, a scanned
  page and a two-column page, so the decision is per page. DOCX files are read
  paragraph by paragraph and table by table, in document order.
- **assess** — text density, page coverage, unicode validity, reading order
  and OCR confidence. A document that fails the assessment goes to the
  `extraction_review` queue and is **not** scored; the recruiter sees why.
- **normalise** — NFKC and whitespace clean-up, plus the language of the
  document. The original language is kept: a Tamil resume stays Tamil.
- **chunk** — the document is cut into its sections (skills, experience,
  education, projects, certifications) and each section into chunks of a few
  hundred tokens, because the embedding model has a token limit.

Everything the pipeline produced is stored side by side in `resume_documents`
(the text as extracted, the normalised text, the language, the method, the
quality report) and `resume_chunks` (the chunks and their embeddings), so a
better extractor can be dropped in later without asking anybody to upload
their CV again.

The semantic score compares the job against **every chunk** and keeps the best
match, instead of comparing two single vectors.

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

**English is the supported scope.** The embedding model also covers other
scripts (Tamil, Arabic, Chinese, …) — but only if the GGUF was converted with
the XLM-R tokenizer. See *Embedding model files* below for the files that
work.

### Download, in order

1. **llama.cpp for Windows (CPU)** — <https://github.com/ggml-org/llama.cpp/releases>
   Take the `llama-*-bin-win-cpu-x64` zip, unzip it to `C:\Users\<you>\llama.cpp\`.
   You need `llama-server.exe` from it.
2. **The embedding model** — <https://huggingface.co/TwinSunsLLC/multilingual-e5-small-gguf>
   Download `multilingual-e5-small-q8_0.gguf` (132 MB) and keep its name.

   > The upstream name is shared by other builds that cannot read non-Latin
   > text, so check the file you downloaded:
   > `llama-tokenize -m <file> -p "தமிழ்"` must give one token, not a run of
   > `32`.
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
├── multilingual-e5-small-q8_0.gguf      (embeddings, the default)
└── qwen2.5-0.5b-instruct-q4_k_m.gguf    (chat)
```

### Embedding model files

| File | Size | Purpose |
| --- | --- | --- |
| `qwen2.5-0.5b-instruct-q4_k_m.gguf` | 469 MB | chat: resume extraction, JD analysis, narrative (`:9931`) |
| `multilingual-e5-small-q8_0.gguf` | 132 MB | embeddings, 384 dimensions (`:9932`) |

Only these two are needed. The upstream name
`multilingual-e5-small-q8_0.gguf` is also used by a build that **cannot read
non-Latin text**: every non-Latin character becomes `<unk>`, so Tamil, Arabic
and Chinese all embed to the same vector. If you replace the file, check it
with `llama-tokenize -m <file> -p "தமிழ்"` — one token is right, a run of `32`
is the broken conversion.

`AI_LOCAL_EMBEDDING_MODEL` is both the name the service asks for and the cache
key of every stored vector: change it whenever the file changes, or the
previous vectors are reused. Swapping files needs no migration — all these
builds are 384-dimensional.

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

From inside the AI container the host is reached by another name, and the
image carries `curl` for exactly this check:

```sh
docker exec job-board-local-ai-platform-1 \
  curl -s http://host.docker.internal:9931/v1/models
docker exec job-board-local-ai-platform-1 \
  curl -s http://host.docker.internal:9932/v1/models
```

`host.docker.internal` resolves only inside a container, so the same URL fails
from the host and a bare `localhost` fails inside — matching the URL to where
you run it is the whole trick.

### Configuration

The AI service talks to them over the OpenAI-compatible API:

| Setting | Value |
| --- | --- |
| `AI_LOCAL_LLM_BASE_URL` | `http://localhost:9931/v1` (host) · `http://host.docker.internal:9931/v1` (container) |
| `AI_LOCAL_LLM_MODEL` | `local-chat` (the `--alias` of the chat server) |
| `AI_EMBEDDING_BASE_URL` | `http://localhost:9932/v1` (host) · `http://host.docker.internal:9932/v1` (container) |
| `AI_LOCAL_EMBEDDING_MODEL` | `multilingual-e5-small-xlmr` (must match the launcher's `--alias`) |
| `AI_EMBEDDING_DIM` | `384` |

The compose overlays set the container-side URLs; the env file keeps the
host-side ones.

### The chat model: prompt, limits and swapping the file

The local chat model is an ordinary OpenAI-compatible endpoint, so the file
behind it is configuration. To use another one: put the new GGUF in the models
directory, point `CHAT_MODEL` (the launcher) at it, keep the server alias (or
update `AI_LOCAL_LLM_MODEL`), and restart the server. No code changes.

A small model on a CPU is not reliable at structured output, so one call goes
through three attempts (`app/services/local_llm.py`):

1. `response_format: json_object`, with a compact field list in the system
   prompt - the shape a 0.5 B model actually follows.
2. The same prompt without `response_format`, for a server build that rejects
   it.
3. One repair, which hands the model the validation error it made.

The field list is used instead of the JSON Schema document, and
`response_format: json_schema` (llama.cpp's grammar mode) is not used: on this
model and server the grammar made the answer run to the token cap instead of
finishing, while the field list produced the same object in a third of the
tokens.

A server that is unreachable, or a call that runs out of time, is **not**
retried with another format: the orchestrator moves to the next route instead
of spending the budget on a dead server.

| Setting | Default | What it does |
| --- | --- | --- |
| `AI_LOCAL_LLM_TIMEOUT_SECONDS` | `180` | per-call timeout for the local route |
| `AI_LOCAL_LLM_MAX_INPUT_CHARS` | `8000` | how much of the prompt the model reads |
| `AI_LOCAL_LLM_MAX_TOKENS` | `900` | hard cap on one answer |
| `AI_LOCAL_LLM_TEMPERATURE` | `0` | structured output wants no creativity |

The server's context is 8192 tokens (`CONTEXT_SIZE` in the launcher). One call
has to fit the capped input, the field list and the answer in that window, so
raise both together if you raise the input cap.

Instruction following is a property of the file, not of this code: the 0.5 B
model used during development writes its assessment in English even when
`outputLanguage` asks for Tamil, and it sometimes repeats a risk. The prompts
ask for both correctly; a larger GGUF follows them, and swapping the file is
the whole change.

If the model still cannot produce a valid object, the run degrades to
"score only": the deterministic score is stored and the recruiter sees the
number without a narrative.

Probe the model without a database, RabbitMQ or a resume upload:

```sh
uv run python -m app.scripts.probe_local_model
uv run python -m app.scripts.probe_local_model --language ta
```

### Languages

English is the supported scope. Other scripts work as far as the pipeline is
concerned, and the pieces are independent:

- **Reading the document.** A PDF with a text layer is read as it is. An
  image-only (scanned) page goes through Tesseract and needs that script's
  data pack (see *OCR languages* below). No chat or embedding model is
  involved.
- **Comparing text.** `multilingual-e5-small` embeds about 100 languages into
  the same 384-dimension space, so a Tamil, Arabic or Chinese resume can be
  compared with an English job description — **provided the GGUF was converted
  with the XLM-R tokenizer** (see *Embedding model files*). A BERT-tokenizer
  conversion embeds every non-Latin script to the same vector, which looks
  fine in the database and means nothing.
- **Matching skills.** Exact and alias matching compares strings, so a Tamil
  `பைதான்` does not equal `Python`. The cross-language fallback — embedding the
  unmatched skill names and accepting a measured threshold — is the remaining
  gap; until it lands, the skills component of such an application is 0.

### Changing the embedding model

The model name and the vector size are configuration, never constants baked
into the schema. Changing the size also needs

1. an Alembic migration that alters the column
   (`ALTER COLUMN ... TYPE vector(N)`) and rebuilds the HNSW index, and
2. `uv run python -m app.scripts.convert_embeddings` to re-embed the stored
   texts — a vector cannot be converted between models or sizes, it has to be
   computed again.

Swapping the **file** without changing the size still needs a new
`AI_LOCAL_EMBEDDING_MODEL` name: the stored vectors are keyed by it, and
keeping the old name would silently reuse vectors produced by the previous
model. The old rows are harmless — they are simply never selected again.

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
