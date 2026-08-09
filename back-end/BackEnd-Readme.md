# JobBoard Backend
The Backend is split into services with their own responsibilities.
The Backend is built using NestJS for Core Services and Python with FastAPI and Langchain for AI related services. PostgreSQL is used as Database store.
Each service will have it's own database store behave in a truly microservice way.

The Project uses following tech stack and tools.
- NestJS (Express Adapter) with TypeScript.
- MikroORM (Entity ORM).
- Langchain (LLM Orchestration).
- FastAPI
- PydanticAI
- SQLmodel (Python database ORM)
- Alembic (Migration Tool)
- PostgreSQL
- Docker


## list of Services
1. [platform-api](./platform-api/API-Readme.md) : main service handling job related operations
2. [ai-platform](./ai-platform/AI-API-Readme.md) : AI related operations like resume parsing and job matching.