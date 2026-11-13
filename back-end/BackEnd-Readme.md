# JobBoard Backend
The Backend is split into services with their own responsibilities.
The Backend is built using NestJS for Core Services and Python with FastAPI and Langchain for AI related services. PostgreSQL is used as the database store, and Redis is used for short-lived state such as sessions and OTPs.
Each service has its own database store, behaving in a truly microservice way.

The Project uses following tech stack and tools.
- NestJS (Express Adapter) with TypeScript.
- MikroORM v7 (entity mapping via `EntitySchema`).
- Langchain (LLM Orchestration).
- FastAPI
- PydanticAI
- SQLmodel (Python database ORM)
- Alembic (Migration Tool)
- PostgreSQL
- Redis (sessions and OTPs)
- Docker


## List of Services
1. [platform-api](./platform-api/API-Readme.md) : main service handling job related operations
2. [ai-platform](./ai-platform/AI-API-Readme.md) : AI related operations like resume parsing and job matching.

> Note: The files Job-Board-up-v1.sql and Job-Board.dbml are just reference for initial db design. For the modules already implemented, MikroORM migrations in `platform-api/src/migrations` are the schema source; `recruitment_db.sql` and `ats_ai_db.sql` remain references for the full planned schema split by service.

## Object storage (Garage S3)

Uploaded files are stored in **Garage**, a self-hosted S3-compatible object store. Each environment has its own bucket and Docker volume; PostgreSQL `files` rows only hold metadata plus the object key.

Path prefixes inside the single bucket:

* `resumes/`
* `cover-letters/`
* `offer-letters/`
* `profile-images/`
* `other/`

Compose provides:

* `garage` — S3 API (`3900`) and admin API (`3903`).
* `garage-init` — one-shot layout/bucket/key bootstrap.
* `garage-webui` — optional file browser, `debug` profile only (`http://localhost:3909`).

Per-environment volumes: `job-board-local-garage-data`, `job-board-staging-garage-data`, `job-board-prod-garage-data`.

All `/api/files` routes require a valid session. File bytes stream through `GET /api/files/:id/content`; no public or presigned URL is exposed to browsers. Ownership is stored on `files.owner_type`/`owner_id`: candidates can only read and delete their own uploads, while internal users can read every file for candidate review. Recruiters can additionally share a file with a specific candidate through `POST /api/files/:id/grants` (backed by `file_access_grants`); the candidate can then read it but cannot delete it, and the grant can be revoked.

See `platform-api/API-Readme.md` §6.6 for S3 env vars, bootstrap details, file access rules, and Garage quirks.


## Running the stack

All Docker deployment commands — first-run order, image builds, migrations, seeds, Garage
bootstrap, debug profiles, volumes and troubleshooting — live in
[`infrastructure/docker/README.md`](./infrastructure/docker/README.md).

Quick start (from `back-end/`):

```sh
docker compose --env-file ./env/.env.local up --build
```



| Concern | Local | Staging | Production |
| :--- | :--- | :--- | :--- |
| NestJS | Docker/local | Docker | Docker |
| Source bind mount | ✅ | ❌ | ❌ |
| Nest watch | ✅ | ❌ | ❌ |
| TypeScript build | optional | image build | image build |
| Postgres | Docker | Docker/managed | managed eventually |
| Redis | Docker | Docker/managed | managed eventually |
| Object storage | Garage (Docker) | Garage (Docker) | Garage/managed |
| .env | .env.local | .env.staging | .env.production/external |
| Secrets in Git | ❌ | ❌ | ❌ |
| Fixed OTP | ✅ | ❌ | ❌ |
| Debug logging | ✅ | limited | ❌ |
| NODE_ENV | local | staging | production |
| Source code in image |  not important | ✅ built artifact | ✅ built artifact |
| container_name | ❌ | ❌ | ❌ |
| Hardcoded passwords | ❌ | ❌ | ❌ |

> Sessions and OTPs live only in Redis; PostgreSQL has no session table.
> `DEV_FIXED_OTP` is active only when `NODE_ENV=local` (default `123456`); staging and production generate random OTPs.