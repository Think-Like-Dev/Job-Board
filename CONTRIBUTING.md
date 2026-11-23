# Contributing

This repository is a monorepo with four independently installed applications and no root
workspace manifest:

| Path | Stack | Port |
|---|---|---|
| `front-end/candidate-portal` | React + Vite + TypeScript | 5173 |
| `front-end/recruiter-platform` | React + Vite + TypeScript | 5174 when both run |
| `back-end/platform-api` | NestJS + MikroORM + PostgreSQL | 5000 (`/api`, Swagger `/api/docs`) |
| `back-end/ai-platform` | FastAPI + LangGraph + PostgreSQL/pgvector | 8000 |

Docker Compose files live in `back-end/infrastructure/docker/`. Always run Compose from
`back-end/` so the `--env-file ./env/...` arguments and the `../../` build contexts resolve.

## 1. Initial setup

### Toolchain

- **Node 22 LTS** (the API images use `node:22-bookworm-slim`).
- **pnpm 12.21.0** — pinned in every `package.json` (`packageManager`) and in the API
  Dockerfiles. Enable it with `corepack enable` (then pnpm reads the pin) or install it
  directly with `npm install -g pnpm@12.21.0`. Do not mix pnpm majors across machines.
- **Docker Engine + Compose v2**.
- **Python 3.14** and **uv** for the AI service (`uv sync` creates `back-end/ai-platform/.venv`).
- **Git Bash** on Windows (the `./dk` helper and the Git hook are POSIX shell scripts; the
  terminal itself does not matter because Git runs hooks with its own bash).

### First checkout

```sh
git clone <repository-url>
cd Job-Board

./dk setup                 # back-end/env files from the templates + host node_modules
./scripts/setup-hooks.sh   # enables .githooks/ for this clone
```

`./dk setup` is idempotent. It creates `back-end/env/.env.local` (and the rest of
`back-end/env/`) from the tracked template; those files are gitignored. Keep secrets there,
never in source files.

Install each app separately when you work on it:

```sh
cd front-end/candidate-portal && pnpm install
cd front-end/recruiter-platform && pnpm install
cd back-end/platform-api && pnpm install
cd back-end/ai-platform && uv sync
```

### Git hooks (this replaces husky / pre-commit install)

The hook lives at `.githooks/pre-commit` and is enabled with a Git setting, not an npm
package:

```sh
./scripts/setup-hooks.sh
# equivalent to:
git config core.hooksPath .githooks
```

Run this **once per clone**. `core.hooksPath` is local configuration, so a fresh clone has no
hook until the script runs. The repository deliberately does not use husky, `pre-commit
install`, or lefthook.

The hook works when you commit from any subdirectory and from any terminal, including IDE and
GUI clients: Git changes the process working directory to the work-tree root before running
it, and the hook also does so explicitly. It is written for bash 3.2+, so the bash that ships
with macOS is enough. Requirements per project: `pnpm` for the two frontends and
`platform-api`, `uv` for `ai-platform`. If a tool is missing, the hook fails with a message
instead of silently skipping.

What it checks, and only for the projects the commit touches:

| Project | Checks |
|---|---|
| each frontend | ESLint with `--max-warnings 0`, `prettier --check`, `pnpm build` (`tsc -b` + Vite) |
| `platform-api` | ESLint with `--max-warnings 0`, `prettier --check`, `pnpm build` (SWC + typecheck) |
| `ai-platform` | `ruff format --check`, `ruff check` on the staged Python files |
| both back ends | migration filename length (see §4) |

Lint and formatting run on the staged files only; the build runs the whole affected project
because types cross file boundaries. The hook never runs `--fix` or `--write`: it reports and
blocks, and you stage the fix yourself. `git commit --no-verify` exists as an emergency exit;
do not use it to land failing code.

Manual equivalents:

```sh
# frontends
pnpm lint && pnpm format:check && pnpm build

# platform-api
pnpm exec eslint "{src,apps,libs,test}/**/*.ts" --max-warnings 0
pnpm exec prettier --check "src/**/*.ts" "test/**/*.ts"
pnpm build

# ai-platform, on changed files
cd back-end/ai-platform
uv run ruff format --check <files> && uv run ruff check <files>
```

Prettier enforcement is incremental: the repo-wide `pnpm format:check` still lists files
written before the config landed, so it is not a merge gate. Run `pnpm format` only when you
mean to reformat a whole app.

## 2. Running the stack

```sh
./dk run:dev          # whole local stack (postgres, redis, rabbitmq, garage, api, ai)
./dk logs:dev api     # follow one service
./dk stop             # stop containers
./dk doctor           # verify docker / compose / node / pnpm / env files
```

Every `./dk` action takes an optional target: `api`, `ai`, `all` (default), or a Compose
service name (`./dk build:dev ai`, `./dk migrate:dev api`). Flags: `--dry-run`, `--yes`.
Deployment details are in `back-end/infrastructure/docker/README.md`.

Direct Compose invocation, from `back-end/`:

```sh
docker compose --env-file ./env/.env.local \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.local.yml \
  up --build
```

Frontends run on the host with `pnpm dev`. The API exposes Swagger at
`http://localhost:5000/api/docs`.

## 3. Checks and conventions

- **TypeScript**: `pnpm build` is the only typecheck (`tsc -b`); run it before pushing.
- **ESLint**: no warnings. Do not silence a rule with `eslint-disable` or by lowering it in
  `eslint.config.*`; fix the code, or raise it with the maintainer.
- **Prettier**: per-app configs (`.prettierrc.json`, `.prettierignore`). Do not reformat
  unrelated files in a feature branch.
- **Python**: `uv run ruff format .` and `uv run ruff check --fix .` from
  `back-end/ai-platform`; configuration lives in `pyproject.toml`.
- **No tests are written during feature work** unless requested; Jest is available for
  `platform-api` (`pnpm test -- <pattern>`).
- Never hardcode UI text: recruiter and candidate copy comes from
  `src/i18n/locales/en.json`. Reuse `common.*` keys instead of adding a duplicate value.
- Never inline API URLs; frontends use `src/api/endpoints.config.ts` and
  `src/api/httpClient.ts`.

## 4. Migrations

### Node API (`back-end/platform-api`)

MikroORM migrations live in `src/migrations` and are the schema source for implemented
modules. Entities are `*.schema.ts` with `EntitySchema`, not decorators.

```sh
cd back-end/platform-api
pnpm migration:create      # add a migration after an entity change
pnpm migration:up          # apply locally
pnpm migration:list        # status
```

Inside Docker, use `./dk migrate:dev api` from the repository root. Snapshots are disabled.
**Migration filenames are limited to 32 characters including `.ts`** (for example
`Migration20261122000001.ts`); the pre-commit hook rejects longer names. Rename a file before
committing rather than after it is applied in a shared environment.

### Python service (`back-end/ai-platform`)

Alembic revisions live in `alembic/versions`.

```sh
cd back-end/ai-platform
uv run alembic revision -m "add table"      # generated name is too long: rename it
uv run alembic upgrade head
uv run alembic current
```

**Alembic filenames are also limited to 32 characters including `.py`**, e.g.
`20261122_0004_add_outbox.py`. Renaming a revision file is safe when the revision id inside
stays the same. In Docker, use `./dk migrate:dev ai`.

Two databases: `platform-api` owns `recruitment_db`; `ai-platform` owns `job_board_ai_ats`.
The services never read each other's tables; events and Garage objects are the only shared
surface.

## 5. Dependencies and version updates

Each app has its own lockfile; there is no root workspace.

```sh
# frontends / Node API
pnpm up --latest
pnpm build && pnpm lint && pnpm format:check

# AI service
cd back-end/ai-platform
uv lock --upgrade
uv sync
uv run ruff check app
```

When updating **pnpm**, change all of these together and commit them as one change:
`packageManager` in the three `package.json` files, and the `npm install -g pnpm@...` lines in
`back-end/platform-api/Dockerfile` and `Dockerfile.dev`. Bump the Node base image in the same
change if the new pnpm requires a newer Node. Rebuild the API image to confirm
(`./dk build:dev api`).

Native packages (argon2, SWC) rely on `pnpm-workspace.yaml` → `allowBuilds`; add any new
native dependency there if its postinstall is skipped.

## 6. Cleanup

```sh
./dk stop                       # stop the local stack
docker compose -f ... down -v   # also delete named volumes (destroys local data)
pnpm store prune                # per-machine pnpm cache
uv cache prune                  # uv cache
```

Do not commit `.agent-memory/`, `dist/`, coverage output, logs, or downloaded fixtures.
Scratch files belong under `.agent-memory/tmp/` (gitignored), not the system temp directory.

## 7. Repository quirks

- **One Git repository at the root.** No service has its own `.git`. Run Git from anywhere.
- **Root `.gitignore` ignores `*.md`** except `README.md`, `CONTRIBUTING.md`,
  `AI-Readme.md`, and `FUTURE_IMPROVISATIONS.md`. Rename or unignore deliberately.
- **No JWT.** Sessions and OTPs live in Redis under `jobboard:`; the browser holds an
  HttpOnly `session_token` cookie. Candidates are not users and authenticate by email + OTP.
- **Enums are duplicated**: `platform-api/src/common/constants/enums.ts` mirrors the Postgres
  ENUM types. Change both together.
- **Jobs are immutable after publishing** (`DRAFT → PUBLISHED → ARCHIVED`, archived is
  terminal). Only the creator can edit/publish/archive/delete, and every delete is soft.
- **`platform-api` config**: `NODE_ENV` selects `.env.${NODE_ENV}` then `.env`; keep secrets in
  `back-end/env/` (gitignored).
- **Frontends use path aliases** declared per app in `tsconfig.app.json`; Vite resolves them
  through `resolve.tsconfigPaths`. All requests go through the shared HTTP client.
- **Compose**: `compose.yml` declares every service; `compose.<env>.yml` only overrides.
- **Data**: the AI service owns `job_board_ai_ats`; cross-service communication is events +
  Garage, never direct database reads.

## 8. Branches, commits, pull requests

- Branch names follow `type/area/topic`, with `-phase-<n>` when the work is part of a phased
  plan (for example `fix/auth/onboarding-links-phase-1`, `chore/i18n/label-pairs-phase-8c`).
- Keep a branch focused; aim for roughly 30 changed files. Split a large mechanical change by
  concern, not by file count.
- Commit messages use Conventional Commits (`feat(ai): ...`, `fix(team): ...`,
  `refactor(i18n): ...`, `chore(tooling): ...`) and explain the why in the body.
- Open pull requests against the branch the work builds on. Phased work is stacked: each PR
  targets the previous phase, not `main`, and joins the existing GitHub stack (bottom to top).
- Do not commit generated output (`dist/`, caches), environment values, or agent memory.

## 9. Troubleshooting the hook

- **Hook does not run**: `git config --get core.hooksPath` must print `.githooks`. Re-run
  `./scripts/setup-hooks.sh`. GUI clients only run hooks that are enabled for the clone.
- **`pnpm is not on PATH`**: the hook runs in Git's environment, not your interactive shell.
  Install pnpm globally or through corepack, then reopen the client.
- **`bad interpreter` on Windows**: the hook must be checked out with LF endings; this is
  enforced by `.gitattributes` (`eol=lf` for `.githooks/*`). Re-checkout the file if an old
  clone has CRLF.
- **A staged file fails Prettier**: run `pnpm exec prettier --write <file>` in that app and
  stage the result. The hook will not modify your files.
- **Migration name rejected**: rename the file to 32 characters or fewer including the
  extension; the revision id inside is what matters.
