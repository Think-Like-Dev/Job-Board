# Docker & Compose — deployment runbook

Everything container-related for the backend lives here:

```
infrastructure/docker/
├── compose.yml          # base: every service, healthcheck, depends_on, volume keys
├── compose.local.yml    # local: dev images, source mounts, commands, ports, volume names
├── compose.staging.yml  # staging: built images, env file, API ports, volume names
├── compose.prod.yml     # production overlay (incomplete — see §7)
└── dockerctl.sh         # bash shortcuts: run:dev, migrate:staging, … (see §1.5)
```

Two application images (`platform-api`, `ai-platform`) and the infrastructure they need
(two Postgres instances, Redis, RabbitMQ, Garage S3). Frontends are not containerized here.

**Layout rule:** `compose.yml` declares the whole topology. Overlays carry differences only —
`name:`, `env_file`, images, `command`, published ports, bind mounts, volume names. Compose can
add or override a service in an overlay, never delete one.

---

## 0. The one rule

**Run every command in this file from `back-end/`.**

```sh
cd back-end
```

Why: `--env-file` is resolved from your **current directory**, while every relative path
*inside* a compose file (`../../platform-api`, `../../env/.env.local`, `../../garage/garage.toml`)
is resolved from the **compose file's** directory. Run from anywhere else and one of the two
breaks.

Each env file already sets `COMPOSE_FILE`, so `--env-file` alone is enough to select a stack:

```sh
docker compose --env-file ./env/.env.local <command>
```

If that ever stops working (for example on Linux, where the `;` separator in `COMPOSE_FILE`
must become `:`), pass the files explicitly:

```sh
docker compose --env-file ./env/.env.local \
  -f infrastructure/docker/compose.yml \
  -f infrastructure/docker/compose.local.yml <command>
```

Both forms are equivalent for the rest of this document.

If you use the [shortcut commands](#15-shortcut-commands-recommended), this rule is handled for
you — they always execute Compose from `back-end/` no matter where you are.

---

## 1. What gets built

| Service | Dockerfile | Image (local / staging) | Container port |
| :--- | :--- | :--- | :--- |
| `platform-api` | `platform-api/Dockerfile` (prod) · `Dockerfile.dev` (local) | `job-board-platform-api:local` / `:staging` | `5000` |
| `ai-platform` | `ai-platform/Dockerfile` (prod) · `Dockerfile.dev` (local) | `job-board-ai-platform:local` / `:staging` | `8000` |

**Images contain code only.** Every credential, hostname and flag arrives at runtime from
`env/.env.*` via `env_file:`. `.env*` is excluded by both `.dockerignore` files, so a leaked
image cannot leak secrets. If a value is missing from the env file, the container starts with
a default or fails its healthcheck — it is never baked in.

Neither AI Dockerfile declares a `CMD` — like the Node image, they only `EXPOSE` a port. The
run command belongs to the compose service (`command:`), so local, staging and prod can run the
same image differently.

Build one image without starting anything:

```sh
docker compose --env-file ./env/.env.local build platform-api
```

Build both application images:

```sh
docker compose --env-file ./env/.env.local build platform-api ai-platform
```

Name the services explicitly. A bare `build` also walks profile-gated services, and
`migrate`/`seed` reuse the application image tag — build `platform-api` first so they never
have to build their own copy.

`--no-cache` is only needed when a dependency layer is genuinely stale; the uv layer uses a
BuildKit cache mount, so normal rebuilds stay fast.

---

## 1.5 Shortcut commands (recommended)

`infrastructure/docker/dockerctl.sh` wraps every command in this runbook into `action:env`
shortcuts. You never type `--env-file`, `-f` or a path, and they work from **any** directory.
All Docker logic lives in that one bash script. Nothing in it is machine-specific — it resolves
the repo root from its own location.

The repository ships a three-line launcher at its root, so **nothing is installed globally and
no shell config is modified**. `./dk` just forwards to that script:

**Fresh clone** (from the repository root; Git Bash, macOS or Linux):

```sh
./dk doctor          # docker CLI/daemon/compose, git, node, pnpm, uv, env files
./dk setup           # env/.env.local from the template + host dependencies
./dk init:dev        # infra -> build -> migrate (api+ai) -> seed (api+ai) -> garage -> APIs
```

Every action accepts the `action:env` form, e.g. `./dk run:dev`, `./dk migrate:staging`,
`./dk logs:dev platform-api`. On Windows use Git Bash (no PowerShell, no WSL). If the executable
bit was lost while cloning, use `bash dk run:dev` or restore it with `chmod +x dk`.

### Optional: bare commands in the current shell

If you prefer un-prefixed `run:dev`, source the script **for that shell only**. It defines shell
functions and writes nothing to disk:

```sh
source back-end/infrastructure/docker/dockerctl.sh
run:dev
```

Do not append that line to `~/.bashrc`: it is machine-specific, and a `.bashrc` whose last line
has no trailing newline silently glues the append onto the previous command.

Front-ends are not containerized — start them separately with `pnpm dev` in each app.

### Targets: api, ai, or both

`platform-api` and `ai-platform` are treated as two independent services that happen to share
one compose project. Every action takes an optional **target**:

| Target | Meaning |
| :--- | :--- |
| *(omitted)* or `all` | both sides |
| `api` | `platform-api`; for `infra` → `postgres redis`; for db work → `migrate` / `seed` |
| `ai` | `ai-platform`; for `infra` → `ai-postgres`; for db work → `ai-migrate` / `ai-seed` |
| any compose service | `rabbitmq`, `garage`, `ai-postgres`, `redis`, `platform-api`, … |

Migrations and seeds always run as **one compose invocation per service**, so a failure on one
side never blocks or rolls back the other:

```sh
./dk migrate:dev            # api then ai (both)
./dk migrate:dev api        # mikro-orm, core Postgres only
./dk migrate:dev ai         # alembic, AI Postgres only
./dk seed:dev ai            # catalog seeder only
./dk build:dev ai           # rebuild only the Python image
./dk infra:dev rabbitmq     # start one datastore
```

All commands below are prefixed with `./dk`:

| Action | dev | staging | Targets | What it does |
| :--- | :--- | :--- | :--- | :--- |
| `setup` | — | — | none | create `env/.env.local` if missing + `pnpm install` in both front-ends and `platform-api`, `uv sync` |
| `doctor` | — | — | none | check docker CLI/daemon/compose, git, node, pnpm, uv and both env files |
| `build` | `build:dev` | `build:staging` | api, ai, all, `<image service>` | build images |
| `infra` | `infra:dev` | `infra:staging` | api, ai, all, `<service>` | start datastores |
| `up` | `up:dev` | `up:staging` | api, ai, all | start application containers |
| `migrate` | `migrate:dev` | `migrate:staging` | api, ai, all | run migrations |
| `seed` | `seed:dev` | `seed:staging` | api, ai, all | run seeders |
| `run` | `run:dev` | `run:staging` | none | start the whole stack |
| `init` | `init:dev` | `init:staging` | none | infra → build → migrate → seed → garage → run |
| `garage` | `garage:dev` | `garage:staging` | none | start Garage + `garage-init` |
| `debug` | `debug:dev` | `debug:staging` | none | start pgAdmin, RedisInsight, Garage Web UI (profile `debug`) |
| `stop` | `stop:dev` | `stop:staging` | `--volumes` | remove containers, keep volumes |
| `logs` | `logs:dev` | `logs:staging` | service name | follow logs, all services by default |
| `ps` | `ps:dev` | `ps:staging` | none | service status |

### Flags

Flags work anywhere on the command line, and each has an env-var equivalent for CI:

```sh
./dk run:dev --dry-run          # print the compose command, run nothing
./dk --dry-run build:dev ai     # same, flag first
./dk stop:staging --volumes     # asks before deleting data
./dk stop:staging --volumes -y  # no prompt
```

| Flag | Env var | Effect |
| :--- | :--- | :--- |
| `--dry-run` | `DK_DRY_RUN=1` | print the `docker compose` command instead of executing it |
| `--yes`, `-y` | `DK_YES=1` | skip the confirmation prompt for `stop --volumes` |

Behaviour worth knowing:

- **`dev` is the local environment.** It maps to `env/.env.local` and the `job-board-local`
  project; `staging` maps to `env/.env.staging`. There is no separate "dev" stack.
- **`setup` and `doctor` take no environment** — they work on the whole checkout.
- **`setup` never overwrites** an existing `env/.env.local`, and never starts a container.
- **Bash only, cross-platform.** Git Bash on Windows (no PowerShell, no WSL needed), bash on
  macOS/Linux. `./dk` is a launcher; sourcing the script is optional and per-shell only.
- **`stop` keeps data**; only `--volumes` deletes databases/uploads, and it asks first.
- `docker compose ...` is still the underlying tool: the explicit commands in §2 and §3 remain
  valid and are the source of truth if a shortcut ever looks wrong.

---

## 2. Local

### 2.1 First run, in order

Start the datastores (two Postgres instances, Redis, RabbitMQ). The APIs will not come up
correctly before this, so do it explicitly the first time:

```sh
docker compose --env-file ./env/.env.local up -d postgres ai-postgres redis rabbitmq
```

Build the **development** images (source is bind-mounted, dependencies are baked in):

```sh
docker compose --env-file ./env/.env.local build platform-api ai-platform
```

Apply database migrations. Both run as one-shot containers and are removed afterwards:

```sh
docker compose --env-file ./env/.env.local --profile migration run --rm migrate
docker compose --env-file ./env/.env.local --profile migration run --rm ai-migrate
```

Seed the databases:

```sh
docker compose --env-file ./env/.env.local --profile seed run --rm seed
docker compose --env-file ./env/.env.local --profile seed run --rm ai-seed
```

The seeders are idempotent and skip existing rows, so re-running them is safe.

Bootstrap Garage (object storage) once per volume. `garage-init` assigns the node layout,
imports the S3 key, creates the bucket and grants access:

```sh
docker compose --env-file ./env/.env.local up -d garage garage-init
docker logs job-board-local-garage-init-1
```

Finally start the APIs:

```sh
docker compose --env-file ./env/.env.local up -d platform-api ai-platform
```

Verify:

```sh
docker compose --env-file ./env/.env.local ps
curl http://localhost:5000/api/health
curl http://localhost:8000/api/v1/health
```

Expected ports: 
| Service | Port |
| --- | --- |
| Nest API | `5000` |
| FastAPI | `8000` |
| Core PostgreSQL | `5432` |
| AI PostgreSQL | `5433` |
| Redis | `6379` |
| RabbitMQ AMQP | `5672` |
| RabbitMQ management | `15672` |
| Garage S3 | `3900` |

### 2.2 Daily loop

After the first run you only need this. Migrations and seeds are not repeated unless a new
migration or seeder landed:

```sh
docker compose --env-file ./env/.env.local up -d
```

Source is bind-mounted, so edits are picked up without a rebuild. If you changed a
dependency (`package.json`, `pyproject.toml`/`uv.lock`), rebuild that service and recreate it:

```sh
docker compose --env-file ./env/.env.local build platform-api
docker compose --env-file ./env/.env.local up -d platform-api
```

Python dependencies additionally live in the `job-board-local-ai-platform-venv` volume and
Node dependencies in `job-board-platform-api-node-modules`. Docker seeds each from the image
**once**, so after adding a dependency drop the stale volume:

```sh
docker volume rm job-board-local-ai-platform-venv
docker compose --env-file ./env/.env.local up -d --force-recreate ai-platform
```

Same idea for Node: `docker volume rm job-board-platform-api-node-modules`.

### 2.3 Debug tools

All three are behind the `debug` profile — they never start by default:

```sh
docker compose --env-file ./env/.env.local --profile debug up -d pgadmin redisinsight garage-webui
```

| Tool | URL | Notes |
| :--- | :--- | :--- |
| pgAdmin | `http://localhost:5050` | register both servers manually; core = `postgres:5432`, AI = `ai-postgres:5432` |
| RedisInsight | `http://localhost:5540` | connect to `redis:6379` |
| Garage Web UI | `http://localhost:3909` | reads `garage/garage.toml`, talks to `http://garage:3903` |

All three URLs above only exist locally: their host ports are declared in `compose.local.yml`.
In staging the tools still run but publish nothing, so use `docker compose ... exec`.

Optional basic auth for the Garage UI comes from `GARAGE_WEBUI_AUTH` (`username:bcrypt-hash`
from `htpasswd -nbBC 10 user pass`).

RabbitMQ management is not profile-gated — it is the broker itself on `http://localhost:15672`
(local only), signed in with `RABBITMQ_USER` / `RABBITMQ_PASSWORD`. See §6.

---

## 3. Staging

Staging builds the **production** Dockerfiles — there is no source bind mount, the code is
inside the image.

Build the images first; migration and seed reuse the same tags:

```sh
docker compose --env-file ./env/.env.staging build platform-api ai-platform
```

Start infrastructure:

```sh
docker compose --env-file ./env/.env.staging up -d postgres ai-postgres redis rabbitmq
```

Migrate and seed. Staging commands run the compiled output (`:dist` / `alembic` from the
image venv); you do not pass the script name yourself:

```sh
docker compose --env-file ./env/.env.staging --profile migration run --rm migrate
docker compose --env-file ./env/.env.staging --profile migration run --rm ai-migrate

docker compose --env-file ./env/.env.staging --profile seed run --rm seed
docker compose --env-file ./env/.env.staging --profile seed run --rm ai-seed
```

Bootstrap Garage for the staging volume (same one-shot service, different volume):

```sh
docker compose --env-file ./env/.env.staging up -d garage garage-init
docker logs job-board-staging-garage-init-1
```

Start the APIs:

```sh
docker compose --env-file ./env/.env.staging up -d platform-api ai-platform
```

Redeploys after a code change need a rebuild — nothing is mounted:

```sh
docker compose --env-file ./env/.env.staging build platform-api ai-platform
docker compose --env-file ./env/.env.staging up -d --no-deps platform-api ai-platform
```

Staging publishes **no** infrastructure port — not `postgres`, `ai-postgres`, `redis`,
`rabbitmq` or `garage`. Reach them with `docker exec` over the compose network; never expose
`5432`/`6379`/`5672` publicly.

---

## 4. Environment files

| Stack | File | Selected by |
| :--- | :--- | :--- |
| local | `env/.env.local` | `--env-file ./env/.env.local` |
| staging | `env/.env.staging` | `--env-file ./env/.env.staging` |
| production | `env/.env.production` | `--env-file ./env/.env.production` |

Two different mechanisms, easy to confuse:

- `--env-file` feeds **Compose itself** — `${DATABASE_USER}` style interpolation in the YAML.
- `env_file:` inside a service feeds **the container** — the actual runtime environment.

Both point at the same file, so one file configures both layers. `env/` is gitignored; never
commit its contents. The committed template is `env/.env.example` — a fresh clone has no
`.env.local` until you run `setup` (or copy it yourself):

```sh
cp back-end/env/.env.example back-end/env/.env.local
```

Names that matter:

- Core API reads `DATABASE_*`, `REDIS_*`, `S3_*`, `SESSION_*`.
- AI service reads `AI_*`. Its database settings are `AI_DATABASE_*`; the bare `DATABASE_*`
  names still work as a fallback, which is why both services can share one env file without
  overwriting each other's host.
- Both services read `RABBITMQ_*` — one broker, one set of credentials (see §6).

---

## 5. AI platform specifics

Endpoints other than `/health` require the `X-Internal-Token` header. `AI_INTERNAL_TOKEN` must
match what the core API sends, and `AI_ENCRYPTION_KEY` (32 random bytes, urlsafe base64) is
required before any BYOK provider credential can be stored:

```sh
python -c "import base64,os;print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

Health endpoints, for healthcheck debugging:

```sh
curl http://localhost:8000/api/v1/health        # liveness, no DB
curl http://localhost:8000/api/v1/health/ready  # pings Postgres
```

Migrations are Alembic and live in `ai-platform/alembic/versions`. They are **never** run from
the app entrypoint — multi-replica deployments would race. Always use the `ai-migrate` service:

```sh
docker compose --env-file ./env/.env.local --profile migration run --rm ai-migrate
```

`app/workers/` is empty today. When RabbitMQ consumers land they will reuse the same image
with a different command, not a new Dockerfile.

---

## 6. RabbitMQ

One broker, shared by both APIs. It exists so `platform-api` and `ai-platform` can talk without
calling each other over HTTP for background work. **No consumers are wired yet** — the container
runs, but nothing publishes or subscribes until the worker code lands.

Connection values (both services receive them from the same env file):

| Variable | Value | Notes |
| :--- | :--- | :--- |
| `RABBITMQ_HOST` | `rabbitmq` | service name on the compose network |
| `RABBITMQ_PORT` | `5672` | AMQP |
| `RABBITMQ_USER` / `RABBITMQ_PASSWORD` | from `env/.env.*` | also the management UI login |
| `RABBITMQ_VHOST` | `/` | default vhost |

Management UI (local only): `http://localhost:15672`.

```sh
docker compose --env-file ./env/.env.local up -d rabbitmq
```

Check it is alive:

```sh
docker compose --env-file ./env/.env.local exec rabbitmq rabbitmq-diagnostics -q ping
docker compose --env-file ./env/.env.local exec rabbitmq rabbitmqctl list_queues
```

Staging runs the same image with **no host ports**, so `5672` and `15672` stay on the compose
network. A queue you create from a laptop will not be reachable there by port-forwarding alone.

---

## 7. Production — not ready

`compose.prod.yml` is an overlay stub. Known gaps, fix before deploying:

1. **No `command:` for `platform-api`.** The prod image contains only `dist/`, so it needs
   `command: ["pnpm", "start:dist"]` (local/staging set this for you; prod does not).
2. **No `name:`** in the overlay, so the Compose project falls back to the directory name
   (`docker`) — confusing in `docker ps`, and easy to collide with another stack.
3. **Garage secrets.** `garage/garage.toml` still holds local-development values —
   replace `rpc_secret`, `admin_token`, `metrics_token` and the S3 credentials.
4. **AI service has no prod overlay at all** (no `AI_*` env file, no port).
5. **No `rabbitmq` service** in the prod overlay.
6. `.env.staging` now carries `AI_*` and `RABBITMQ_*` keys, but every value is `CHANGE_ME`.

Do not run `docker compose ... up` against prod until 1–2 are fixed.

---

## 8. Common operations

Follow the logs of one service:

```sh
docker compose --env-file ./env/.env.local logs -f platform-api
```

Open a shell inside a running container (the AI image is non-root, `appuser`):

```sh
docker compose --env-file ./env/.env.local exec ai-platform bash
```

Stop everything but keep volumes and data:

```sh
docker compose --env-file ./env/.env.local down
```

Restart one service after an env-file edit (env changes are not picked up live):

```sh
docker compose --env-file ./env/.env.local up -d --force-recreate platform-api
```

Delete every volume for this stack — **destroys local databases and uploads**:

```sh
docker compose --env-file ./env/.env.local down -v
```

Run a migration `down` or up-to-a-revision manually (local, TypeScript sources). The args
replace the service's default command:

```sh
docker compose --env-file ./env/.env.local --profile migration run --rm migrate pnpm migration:down
docker compose --env-file ./env/.env.local --profile migration run --rm migrate pnpm migration:up --to Migration20261104000000
```

In staging/production the image only has `dist/`, so use the `:dist` variants:

```sh
docker compose --env-file ./env/.env.staging --profile migration run --rm migrate pnpm migration:down:dist
```

Alembic equivalents:

```sh
docker compose --env-file ./env/.env.local --profile migration run --rm ai-migrate alembic downgrade -1
docker compose --env-file ./env/.env.local --profile migration run --rm ai-migrate alembic current
```

---

## 9. Volumes

| Purpose | Local | Staging |
| :--- | :--- | :--- |
| Core Postgres | `job-board-local-postgres-data` | `job-board-staging-postgres-data` |
| AI Postgres (pgvector) | `job-board-local-ai-postgres-data` | `job-board-staging-ai-postgres-data` |
| Redis | `job-board-local-redis-data` | `job-board-staging-redis-data` |
| RabbitMQ | `job-board-local-rabbitmq-data` | `job-board-staging-rabbitmq-data` |
| Garage objects | `job-board-local-garage-data` | `job-board-staging-garage-data` |
| Python venv (dev only) | `job-board-local-ai-platform-venv` | — |
| Node modules (dev only) | `job-board-platform-api-node-modules` | — |
| pgAdmin / RedisInsight | `job-board-pgadmin-data`, `job-board-redisinsight-data` | shared |

Volumes are per environment on purpose: a staging run can never touch local data. The two
Postgres instances are separate because `max_connections` is a limit **per instance** — the
default 100 is shared by every database on that server, so pooling one service could starve
the other. The AI instance must use a pgvector-capable image; the core instance does not.

---

## 10. Quirks

1. **Profiles are off by default.** `migrate`, `seed`, `ai-migrate`, `ai-seed`, `pgadmin`,
   `redisinsight` and `garage-webui` only start when their profile is named.
2. **Named volumes are seeded once.** `job-board-local-ai-platform-venv` and
   `job-board-platform-api-node-modules` are copied from the image on first create only.
   Stale dependencies after a rebuild mean deleting the volume.
3. **`garage-init` is one-shot and safe to re-run.** It shares Garage's network namespace so
   the CLI can reach `127.0.0.1:3901`.
4. **Garage ships distroless** (no `/bin/sh`), which is why `garage/Dockerfile.init` copies the
   static binary into an Alpine image for the bootstrap step.
5. **Migrations never run in an app entrypoint.** They are separate profile services so
   replicas cannot race.
6. **`--env-file` alone does not inject variables into containers.** Without `env_file:` in the
   service block, the process sees nothing.
7. **Source watchers on Windows.** Docker Desktop does not always deliver host file events to
   the container. If an edit does not trigger a reload (Nest watch or uvicorn `--reload`),
   restart the container: `docker compose ... restart platform-api`.
8. **uvicorn watches `app/` only** (`--reload-dir app`), so `.venv` and `__pycache__` do not
   burn CPU.
9. **`uv:latest` is unpinned** in both AI Dockerfiles, and `pgvector/pgvector:pg18` is
   unverified. Pin the uv image tag once a build is proven.
10. **Healthchecks gate `depends_on`.** `platform-api` waits for healthy `postgres`/`redis`;
    `ai-platform` waits for healthy `ai-postgres`. A container that crashes on boot usually
    means a missing env value, not a bad image.
11. **`up -d` recreates only what changed.** If a service looks stale, `--force-recreate` beats
    `restart`.
12. **Staging publishes no infrastructure ports.** Only `5000` and `8000` leave the host. All of
    `postgres`, `ai-postgres`, `redis`, `rabbitmq` and `garage` stay reachable by service name
    only, so `localhost:5432` from your machine will refuse to connect — this is deliberate, not
    a broken stack. Use `docker compose exec` (or a loopback-only bind, e.g.
    `127.0.0.1:5433:5432`, for a temporary GUI session). Local publishes every infra port, which
    is why it behaves differently.
13. **`compose.yml` declares every service**; overlays only add or override. A service cannot be
    removed by an overlay, so anything prod should not run has to be handled when the prod
    overlay is written (profiles or a separate base).

---

## 11. Troubleshooting

`docker compose ... ps` shows a service as `unhealthy` or restarting:

```sh
docker compose --env-file ./env/.env.local logs --tail 50 platform-api
```

`ai-platform` dies on start with a database error — confirm the AI database is the pgvector
image and the credentials match both places they are read from:

```sh
docker compose --env-file ./env/.env.local exec ai-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select extname from pg_extension;"'
```

Uploads fail with S3 errors — Garage was never bootstrapped, or the bucket/key in the env file
does not match what `garage-init` imported:

```sh
docker logs job-board-local-garage-init-1
```

Migrations fail with "relation already exists" — a stale volume from an older schema. Either
run `migration:down` to the right revision, or wipe the volume (destroys data).
