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


Local everything in Docker
```sh
docker compose --env-file ./env/.env.local up --build
```

Staging
```sh
docker compose --env-file ./env/.env.staging0 up -d --build
```

Production
```sh
docker compose --env-file ./env/.env.production up -d --build
```



| Concern | Local | Staging | Production |
| :--- | :--- | :--- | :--- |
| NestJS | Docker/local | Docker | Docker |
| Source bind mount | ✅ | ❌ | ❌ |
| Nest watch | ✅ | ❌ | ❌ |
| TypeScript build | optional | image build | image build |
| Postgres | Docker | Docker/managed | managed eventually |
| Redis | Docker | Docker/managed | managed eventually |
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