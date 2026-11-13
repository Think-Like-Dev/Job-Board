#!/usr/bin/env bash
# Docker command shortcuts for the Job-Board backend.
#
# Cross-platform: Git Bash (Windows), macOS, Linux. No PowerShell, no WSL.
# Nothing global is installed; invoke through the repo-root launcher:
#
#   ./dk <action>:<env> [target] [flags]
#
# `api` and `ai` are independent services (platform-api + postgres, ai-platform +
# ai-postgres). Every action takes an optional target: omit it for everything,
# or name one side / one compose service.
#
# All Docker logic lives in this file. Paths are resolved from its own location,
# so it works from any working directory.

# --- paths -----------------------------------------------------------------
# BASH_SOURCE[0] is this file both when sourced and when executed directly.
_DK_BACKEND="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)" || return 1
_DK_ROOT="$(cd "$_DK_BACKEND/.." && pwd)" || return 1

# dev is the user-facing name for the "local" environment (env/.env.local,
# project job-board-local).
_dk_env_file() {
  case "$1" in
    dev|local) printf 'local' ;;
    staging)   printf 'staging' ;;
    *)         return 1 ;;
  esac
}

_dk_usage() {
  cat <<'EOF'
Usage: ./dk <action>:<env> [target] [flags]
       ./dk <action> <env> [target] [flags]

Environments
  dev        env/.env.local    (compose project job-board-local)
  staging    env/.env.staging  (compose project job-board-staging)

Targets (optional — omit to apply to both services)
  all        everything the action covers (default)
  api        platform-api  ->  postgres + redis for infra, migrate/seed for db work
  ai         ai-platform   ->  ai-postgres for infra, alembic for db work
  <service>  any compose service, e.g. rabbitmq, garage, ai-postgres, redis

Actions
  build   [target]   build images (api, ai, all, platform-api, ai-platform)
  infra   [target]   start datastores (api|ai|all or a single service)
  up      [target]   start app containers only (api|ai|all)
  run                start the whole stack
  garage             start garage + run the one-shot garage-init
  debug              start the debug tools (pgadmin, redisinsight, garage-webui)
  migrate [target]   run migrations, one compose invocation per service (api|ai|all)
  seed    [target]   run seeders, one compose invocation per service (api|ai|all)
  init               first run: infra -> build -> migrate -> seed -> garage -> run
  stop               remove containers, keep volumes
  logs    [service]  follow logs (all services by default)
  ps                 status of every service (takes no target)
  setup              create env/.env.local from the template + host dependencies
  doctor             check docker/compose/git/node/pnpm/uv and both env files

Flags (also usable anywhere on the command line)
  --dry-run          print the docker compose command instead of running it
  --yes, -y          skip the confirmation prompt for --volumes

Stop options
  --volumes          also delete volumes (asks first)

Examples
  ./dk build:dev ai
  ./dk migrate:dev api
  ./dk seed:staging ai
  ./dk infra:dev rabbitmq
  ./dk up:dev api
  ./dk logs:dev ai-platform
  ./dk run:dev --dry-run
  ./dk stop:staging --volumes

Environment variables (optional, same effect as the flags)
  DK_DRY_RUN=1       print commands instead of running them
  DK_YES=1           skip the destructive confirmation prompt
EOF
}

# --- compose plumbing ------------------------------------------------------
# Sets _DK_CMD for the given environment and validates every prerequisite.
_dk_prepare() {
  local env_name="$1" env_file backend env_path

  [ -n "$env_name" ] || { printf 'environment required: dev | staging\n' >&2; return 2; }
  env_file="$(_dk_env_file "$env_name")" || {
    printf 'unknown environment: %s (use dev|staging)\n' "$env_name" >&2
    return 2
  }

  backend="$_DK_BACKEND"
  env_path="$backend/env/.env.$env_file"

  [ -d "$backend" ] || { printf 'backend directory not found: %s\n' "$backend" >&2; return 2; }
  [ -f "$env_path" ] || {
    printf 'missing env file: %s\nrun `./dk setup` to create it from env/.env.example\n' "$env_path" >&2
    return 2
  }
  command -v docker >/dev/null 2>&1 || { printf 'docker not found on PATH\n' >&2; return 127; }

  # Relative paths only, so MSYS/Git Bash does not rewrite them.
  _DK_CMD=(
    docker compose
    --env-file "./env/.env.$env_file"
    -f infrastructure/docker/compose.yml
    -f "infrastructure/docker/compose.$env_file.yml"
  )
}

_dk_compose() {
  local env_name="$1"
  shift

  _dk_prepare "$env_name" || return $?

  if [ "${DK_DRY_RUN:-0}" = "1" ]; then
    printf '(cd %s && ' "$_DK_BACKEND"
    printf '%q ' "${_DK_CMD[@]}" "$@"
    printf ')\n'
    return 0
  fi

  ( cd "$_DK_BACKEND" && "${_DK_CMD[@]}" "$@" )
}

# Real compose call, used for validation even under --dry-run.
_dk_services() {
  local env_name="$1"
  _dk_prepare "$env_name" || return $?
  ( cd "$_DK_BACKEND" && "${_DK_CMD[@]}" config --services 2>/dev/null )
}

# --- target resolution -----------------------------------------------------
# Default (no target): every service the action covers.
_dk_group() {
  case "$1" in
    build)   printf 'platform-api ai-platform\n' ;;
    infra)   printf 'postgres ai-postgres redis rabbitmq\n' ;;
    up)      printf 'platform-api ai-platform\n' ;;
    migrate) printf 'migrate ai-migrate\n' ;;
    seed)    printf 'seed ai-seed\n' ;;
    *)       return 1 ;;
  esac
}

# api/ai mapped to the services that action cares about for that side.
_dk_alias() {
  case "$1:$2" in
    build:api|build:platform|build:platform-api)      printf 'platform-api\n' ;;
    build:ai|build:ai-platform)                       printf 'ai-platform\n' ;;
    infra:api|infra:platform|infra:platform-api)      printf 'postgres redis\n' ;;
    infra:ai|infra:ai-platform)                       printf 'ai-postgres\n' ;;
    up:api|up:platform|up:platform-api)               printf 'platform-api\n' ;;
    up:ai|up:ai-platform)                             printf 'ai-platform\n' ;;
    migrate:api|migrate:platform|migrate:platform-api) printf 'migrate\n' ;;
    migrate:ai|migrate:ai-platform)                   printf 'ai-migrate\n' ;;
    seed:api|seed:platform|seed:platform-api)         printf 'seed\n' ;;
    seed:ai|seed:ai-platform)                         printf 'ai-seed\n' ;;
    *) return 1 ;;
  esac
}

# Raw compose services each action may target directly.
_dk_raw_allowed() {
  case "$1:$2" in
    build:platform-api|build:ai-platform)                                          return 0 ;;
    infra:postgres|infra:ai-postgres|infra:redis|infra:rabbitmq|infra:garage)      return 0 ;;
    up:platform-api|up:ai-platform)                                                return 0 ;;
    migrate:migrate|migrate:ai-migrate)                                            return 0 ;;
    seed:seed|seed:ai-seed)                                                        return 0 ;;
    *) return 1 ;;
  esac
}

_dk_resolve() {
  local action="$1" env_name="$2" target="${3:-all}" mapped

  if mapped="$(_dk_alias "$action" "$target")"; then
    printf '%s\n' "$mapped"
    return 0
  fi

  case "$target" in
    all|"") _dk_group "$action"; return $? ;;
  esac

  if _dk_raw_allowed "$action" "$target" && _dk_services "$env_name" | grep -qx "$target"; then
    printf '%s\n' "$target"
    return 0
  fi

  return 1
}

_dk_bad_target() {
  printf 'invalid target for %s: %s\n' "$1" "$2" >&2
  case "$1" in
    build|up) printf '  use: api | ai | all\n' >&2 ;;
    infra)    printf '  use: api | ai | all | postgres | ai-postgres | redis | rabbitmq | garage\n' >&2 ;;
    migrate)  printf '  use: api | ai | all\n' >&2 ;;
    seed)     printf '  use: api | ai | all\n' >&2 ;;
  esac
  return 2
}

# --- actions ---------------------------------------------------------------
_dk_stop() {
  local env_name="$1"
  shift

  local volumes=0 arg
  for arg in "$@"; do
    case "$arg" in
      --volumes|-v) volumes=1 ;;
      *) printf 'unknown stop option: %s\n' "$arg" >&2; return 2 ;;
    esac
  done

  if [ "$volumes" -eq 0 ]; then
    _dk_compose "$env_name" down
    return
  fi

  if [ "${DK_YES:-0}" != "1" ]; then
    if [ ! -t 0 ]; then
      printf 'refusing to delete volumes without a terminal; add --yes\n' >&2
      return 1
    fi
    local answer
    printf 'Delete ALL %s data (databases, uploads, venv/node_modules volumes)? [y/N] ' "$env_name"
    read -r answer
    case "$answer" in
      y|Y|yes|YES) ;;
      *) printf 'aborted\n'; return 1 ;;
    esac
  fi

  _dk_compose "$env_name" down -v
}

_dk_init() {
  local env_name="$1" svc
  _dk_compose "$env_name" up -d postgres ai-postgres redis rabbitmq || return 1
  _dk_compose "$env_name" build platform-api ai-platform           || return 1
  for svc in migrate ai-migrate; do
    _dk_compose "$env_name" --profile migration run --rm "$svc"    || return 1
  done
  for svc in seed ai-seed; do
    _dk_compose "$env_name" --profile seed run --rm "$svc"         || return 1
  done
  _dk_compose "$env_name" up -d garage garage-init                 || return 1
  _dk_compose "$env_name" up -d platform-api ai-platform
}

# First-clone bootstrap: env file + host dependencies. Never starts containers.
_dk_setup() {
  local backend="$_DK_BACKEND" dir

  if [ -f "$backend/env/.env.local" ]; then
    printf 'env/.env.local already exists — left untouched\n'
  elif [ -f "$backend/env/.env.example" ]; then
    cp "$backend/env/.env.example" "$backend/env/.env.local" || return 1
    printf 'created env/.env.local from env/.env.example\n'
  else
    printf 'missing %s/env/.env.example\n' "$backend" >&2
    return 2
  fi

  # Frontends run on the host, so they need node_modules; the API image installs
  # its own. This step is optional if you only run containers.
  if command -v pnpm >/dev/null 2>&1; then
    for dir in front-end/candidate-portal front-end/recruiter-platform back-end/platform-api; do
      [ -f "$_DK_ROOT/$dir/package.json" ] || continue
      printf '== pnpm install (%s)\n' "$dir"
      ( cd "$_DK_ROOT/$dir" && pnpm install ) || return 1
    done
  else
    printf 'pnpm not found — skipping host node_modules (install it: npm i -g pnpm)\n'
  fi

  if command -v uv >/dev/null 2>&1 && [ -f "$backend/ai-platform/pyproject.toml" ]; then
    printf '== uv sync (back-end/ai-platform)\n'
    ( cd "$backend/ai-platform" && uv sync ) || return 1
  fi

  printf '\nready: run `./dk doctor`, then `./dk init:dev`\n'
}

# Prerequisite report. Exits non-zero only when something blocking is missing.
_dk_probe() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf '  ok    %s\n' "$label"
  else
    printf '  MISS  %s\n' "$label"
    return 1
  fi
}

_dk_doctor() {
  local backend="$_DK_BACKEND" rc=0 env_name

  printf 'tools:\n'
  _dk_probe 'docker CLI'        docker --version          || rc=1
  _dk_probe 'docker daemon'     docker info                || rc=1
  _dk_probe 'docker compose v2' docker compose version     || rc=1
  _dk_probe 'git'               git --version              || rc=1
  _dk_probe 'node'              node --version             || printf '        (needed for frontends only)\n'
  _dk_probe 'pnpm'              pnpm --version             || printf '        (needed for frontends only)\n'
  _dk_probe 'uv'                uv --version               || printf '        (optional: AI venv on the host)\n'

  printf 'env files:\n'
  for env_name in local staging; do
    if [ -f "$backend/env/.env.$env_name" ]; then
      printf '  ok    env/.env.%s\n' "$env_name"
    else
      printf '  MISS  env/.env.%s\n' "$env_name"
    fi
  done

  if [ -f "$backend/env/.env.local" ]; then
    if grep -q '^AI_INTERNAL_TOKEN=.\+' "$backend/env/.env.local" 2>/dev/null; then
      printf '  ok    AI_INTERNAL_TOKEN set\n'
    else
      printf '  note  AI_INTERNAL_TOKEN empty (needed once the APIs call each other)\n'
    fi
  fi

  if [ "$rc" -eq 0 ]; then
    printf '\nall blocking prerequisites present — `./dk init:dev` is safe to run\n'
  else
    printf '\ninstall/start the missing tools above before running any container command\n'
  fi
  return "$rc"
}

# --- dispatcher ------------------------------------------------------------
# Accepts "run:dev" and "run dev"; flags may appear before or after.
dk() {
  local action="" env_name="" target="" argv_item
  local -a argv=()

  while [ $# -gt 0 ]; do
    case "$1" in
      --dry-run) DK_DRY_RUN=1 ;;
      --yes|-y)  DK_YES=1 ;;
      *)         argv+=("$1") ;;
    esac
    shift
  done
  set -- "${argv[@]}"

  [ $# -gt 0 ] || { _dk_usage; return 2; }

  case "$1" in
    *:*) action="${1%%:*}"; env_name="${1#*:}"; shift ;;
    *)   action="$1"; shift; env_name="${1:-}"; [ $# -gt 0 ] && shift ;;
  esac
  target="${1:-all}"

  case "$action" in
    help|-h|--help) _dk_usage ;;
    setup)          _dk_setup ;;
    doctor)         _dk_doctor ;;

    ps)
      [ $# -eq 0 ] || { printf 'ps takes no target\n' >&2; return 2; }
      _dk_compose "$env_name" ps ;;

    logs)
      _dk_compose "$env_name" logs -f "$@" ;;

    stop)
      _dk_stop "$env_name" "$@" ;;

    garage)
      _dk_compose "$env_name" up -d garage garage-init ;;

    debug)
      _dk_compose "$env_name" --profile debug up -d pgadmin redisinsight garage-webui ;;

    run)
      _dk_compose "$env_name" up -d ;;

    init)
      _dk_init "$env_name" ;;

    build)
      local build_svcs
      build_svcs="$(_dk_resolve build "$env_name" "$target")" || { _dk_bad_target build "$target"; return 2; }
      # shellcheck disable=SC2086
      _dk_compose "$env_name" build $build_svcs ;;

    infra|up)
      local start_svcs
      start_svcs="$(_dk_resolve "$action" "$env_name" "$target")" || { _dk_bad_target "$action" "$target"; return 2; }
      # shellcheck disable=SC2086
      _dk_compose "$env_name" up -d $start_svcs ;;

    migrate|seed)
      local db_svcs profile one
      db_svcs="$(_dk_resolve "$action" "$env_name" "$target")" || { _dk_bad_target "$action" "$target"; return 2; }
      profile=migration
      [ "$action" = "seed" ] && profile=seed
      # One compose invocation per service: a failure stops only that side.
      for one in $db_svcs; do
        _dk_compose "$env_name" --profile "$profile" run --rm "$one" || return $?
      done ;;

    *)
      printf 'unknown action: %s\n\n' "$action" >&2
      _dk_usage >&2
      return 2 ;;
  esac
}

# --- sugar: build:dev, migrate:staging, ... --------------------------------
for _dk_e in dev staging; do
  for _dk_a in build infra up migrate seed garage debug run init stop logs ps; do
    eval "${_dk_a}:${_dk_e}() { dk ${_dk_a} ${_dk_e} \"\$@\"; }"
  done
done
unset _dk_e _dk_a

# Allow direct execution too: bash dockerctl.sh run dev
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  dk "$@"
fi
