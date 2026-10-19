# AGENTS.md

Job Board / ATS monorepo: two React SPAs, a NestJS core API, and a FastAPI AI service.
The README specs describe the **target** product; the code is only partially built. Check the
relevant module directory before assuming a feature exists.

Full domain brief, schema, enums, and known gaps: `PROJECT_MEMORY.md`.

## Layout & entrypoints

- `front-end/candidate-portal` — candidate SPA (Vite; 5173)
- `front-end/recruiter-platform` — recruiter SPA (Vite; 5174 when both run)
- `back-end/platform-api` — NestJS API on `5000`, global prefix `/api`, Swagger at `/api/docs`
- `back-end/ai-platform` — FastAPI service; only `main.py` exists, no Dockerfile, not in Compose
- Compose files are in `back-end/`; always run Compose from that directory
- `back-end/platform-api` has its own `.git`, while the root repo also tracks its files — check
  `git status` in both before committing
- No CI, pre-commit hooks, or root workspace manifest; each app is installed independently

## Commands

Frontends (run inside the app directory):

```sh
pnpm install
pnpm dev
pnpm build      # tsc -b && vite build — the only typecheck
pnpm lint       # eslint, no --fix
```

Core API (`back-end/platform-api`):

```sh
pnpm start:dev          # Nest watch
pnpm build              # SWC build with typeCheck enabled
pnpm lint               # eslint --fix
pnpm format             # prettier
pnpm test -- <pattern>  # single test; Jest rootDir is src/
```

AI service (`back-end/ai-platform`):

```sh
uv sync
uv run uvicorn main:app --reload
uv run ruff format . && uv run ruff check --fix .
```

Full stack (from `back-end/`):

```sh
docker compose --env-file ./env/.env.local -f compose.yml -f compose.local.yml up --build
```

The production overlay is `compose.prod.yml`.

## Architecture facts an agent will miss

- **No JWT.** Sessions and OTPs live only in Redis under the `jobboard:` prefix; the browser holds
  an HttpOnly `session_token` cookie. Postgres has no sessions table.
- **Candidates are not users.** They live in `candidates` and authenticate with email + OTP, no
  password. Recruiters are `users` with argon2 passwords.
- **Auth is implemented.** `POST /api/auth/otp/request` (candidate email), `POST /api/auth/login`
  (recruiter email + password, sends OTP), `POST /api/auth/otp/verify` (both flows, creates the
  session), `GET /api/auth/me` (session guard), `POST /api/auth/logout`. The OTP record stores the
  intended role, so a recruiter OTP cannot create a candidate session. Both SPAs use these routes;
  `SessionAuthGuard` lives in `src/modules/auth` and attaches `req.session` (currently applied to
  `/auth/me`; add it to future protected controllers).
- **MikroORM v7 uses `EntitySchema`, not decorators.** Entities are `*.schema.ts` in `src/` and are
  auto-discovered by glob. There are no `*AndFlush` helpers: call `em.persist()`/`em.remove()` then
  `em.flush()`.
- **Use `GenericCrudService`** (`src/common/factory`) for standard CRUD. Keep business logic in
  services and DB access in repositories.
- **Enums are duplicated in code and Postgres.** `src/common/constants/enums.ts` mirrors the SQL
  ENUM types; change both together.
- **Migrations live in `src/migrations`.** MikroORM migrations are now the schema source for
  implemented modules; the CLI config is `src/database/mikro-orm.cli.config.ts`. Use
  `pnpm migration:up|down|create|list|pending|check|fresh`. The initial migration covers
  `users`, `candidates`, and `files`; `recruitment_db.sql` / `ats_ai_db.sql` remain references for
  planned tables, and `Job-Board-up-v1.sql` / `.dbml` are stale. Snapshots are disabled
  (`snapshot: false`) so no per-database `.snapshot-*.json` files are generated.
- **Config loading:** `NODE_ENV` selects `.env.${NODE_ENV}` first, then `.env`. Defaults live in
  `src/config/configuration.ts`; secrets belong in `back-end/env/`, which is gitignored.
- **Prod Dockerfile copies `.swcrc`** when building `platform-api`; keep it there or `@src`/`@common`
  path aliases fail in the image.
- `pnpm-workspace.yaml` uses `allowBuilds` for native packages (argon2, swc). Add new native deps
  there if their postinstall scripts are skipped.

## Frontend quirks

- **Candidate mocks are opt-in.** `main.tsx` still imports `api/mockAdapter`, but `.env` sets
  `VITE_MOCK_API=false`; set it to `true` only for offline UI work.
- Recruiter has a real `.env` plus `.env.example`; the old `.env copy` file is stale and ignored.
- Both apps hydrate auth from `GET /auth/me` on load (`useAuthBootstrap`). A 401 from an `/auth/*`
  route means "not signed in" or bad credentials and deliberately does not trigger the global
  redirect; other 401/403 responses clear Redux and redirect.
- All requests go through `src/api/httpClient.ts` and `src/api/endpoints.config.ts`. Never inline
  URLs. Axios already sends credentials.
- Path aliases are per-app in `tsconfig.app.json`; Vite resolves them via `resolve.tsconfigPaths`.
  Recruiter imports mix `@/...`, `@pages/...`, `@store/...`.
- Required conventions: i18n from `src/i18n/locales/en.json` (no hardcoded UI text), enums for
  statuses, Zod + react-hook-form for forms, TanStack Query hooks for server state.
- Candidate routes: `/`, `/jobs/:jobId`, `/profile`, `/applications`. Recruiter gates every route
  on Redux `auth.isAuthenticated` and waits for `auth.isInitialized`, which is set after the
  `/auth/me` bootstrap probe. Recruiter role access is branched in `src/routes/AppRoutes.tsx`:
  only `RECRUITER` gets the dashboard workspace; `ADMIN` and `HIRING_MANAGER` get the welcome page
  until their own screens are built. The shared role enum is `UserRole` in `src/types/auth.types.ts`.

## Backend quirks

- Global `ValidationPipe` uses `whitelist`, `forbidNonWhitelisted`, and `transform`; every accepted
  DTO field must be decorated or the request is rejected.
- Swagger decorators are expected on endpoints and DTO fields.
- Error shape: `{ statusCode, message[], error, timestamp, path }`.
- Pagination shape: `{ data, meta: { totalItems, itemCount, itemsPerPage, totalPages, currentPage } }`.
- The AI service contract (BYOK encryption, provider fallback, `/ats/*` endpoints) is specified in
  `back-end/ai-platform/AI-API-Readme.md` but not implemented.

## Domain rules that are easy to break

- Jobs cannot be edited after publishing; archived jobs are permanently read-only.
- Submitted applications never return to `DRAFT`; withdrawal is allowed only before `IN_REVIEW`.
- Offers must be accepted/rejected before the deadline, otherwise the system sets `AUTO_REJECTED`
  with reason `"no response"`. Rejection always requires a reason.
- Interview round progression is one atomic backend transaction: advance the job round, move
  selected candidates, reject the rest with `"Not shortlisted for round progression"`, and queue
  emails. Do not implement it as per-candidate calls.
- Recruiter candidate page: the left JD panel and right candidate drawer are mutually exclusive;
  closing the drawer must preserve scroll and filters.
- Dynamic application forms are driven by `job_application_questions` + `question_options`, with
  answers in `application_answers`; render the candidate UI from backend config.

## Do not

- Write unit/e2e tests during feature work — the specs explicitly defer them.
- Hardcode UI strings, API URLs, or status strings.
- Introduce JWT.
- Assume a spec'd module exists; inspect `src/modules/` first.

## Repo hygiene

- Root `.gitignore` ignores `*.md` except `README.md` (and `.env.*` except `.env.example`).
  `AGENTS.md` has an explicit exception; other docs you create will be ignored unless unignored.
- Do not commit values from `back-end/env/` or `back-end/secrets/`.

## Specs

- `front-end/candidate-portal/CandidatePortal-Readme.md`
- `front-end/recruiter-platform/RecruiterPlatform-Readme.md`
- `back-end/platform-api/API-Readme.md`
- `back-end/ai-platform/AI-API-Readme.md`
