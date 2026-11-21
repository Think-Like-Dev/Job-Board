# Future improvisations

Ideas that are deliberately **out of scope** for the admin/RBAC programme. Each entry
records what was decided, why it waits, and the shape it should take when it happens.
Nothing here is a commitment.

## Admin system usage dashboard

**Status:** deferred (recorded 2026-11-21).

**What:** an admin-only monitoring screen that answers "is the platform healthy and how
much is it being used?" without opening Compose or a database console. It replaces the
`SYSTEM_USAGE_READ` permission that was sketched but never implemented.

**Why it waits:** the numbers depend on services that are still being stabilised (the AI
pipeline, the RabbitMQ consumers, Garage usage). Shipping gauges before the consumers are
final would mean rewriting the queries twice.

**When it lands, it should show:**

- **Core activity** — totals and 24 h / 7 day deltas for internal users (by status and
  role), candidates, published jobs, applications (by status), interviews and offers.
- **AI activity** — scoring runs started/completed/failed, provider used (local model vs
  BYOK), average scoring latency, and the size of the pending scoring backlog.
- **Queue health** — RabbitMQ queue depth and consumer count for `core.ai.scoring.*` and
  `core.ai.ingest.*`, plus the dead-letter queue count and the age of its oldest message.
- **Storage** — Garage bucket/object counts and bytes, Redis memory used and the number of
  live sessions per principal type (the `sessions:all` index already makes this cheap).
- **Sessions** — the existing admin session screen extended with a "signed in now" counter
  and a per-day sign-in count, rather than a separate page.

**How:** a `SystemUsageModule` in `platform-api` behind one `system.usage.read` permission
(ADMIN only), reading each source through its owner (Postgres aggregates, RabbitMQ
management API, Garage admin API, Redis `INFO`) instead of scraping logs. Poll on demand
with `@nestjs/schedule` caching a 60 second snapshot; no new database tables.

## Multi-tenancy (organisation id)

**Status:** deferred indefinitely (agreed 2026-11-20).

Every table would need an `organisation_id`, sessions would need to carry it, and the
permission bundles would have to become per-organisation. Nothing in the current product
requires more than one tenant, so adding the column now would only add noise to every
query. If it happens, start with the schema and the session payload together so a missing
filter fails closed.

## Admin-defined permission table

**Status:** deferred; the static bundles are the seam.

`PermissionsService` resolves `ROLE_PERMISSIONS` today. When permissions become editable,
only that resolver should change — roles stay static bundles, permissions stay the unit of
authorization, and the SPA keeps mirroring the same strings. A per-tenant override table
would sit behind the same service.

## Session list refinements

**Status:** deferred, cheap to add.

The admin session view lists every live session when no filter is given. For a large
deployment that should be paginated and filterable by principal type and sign-in age, with
the expiry-pruned sorted set already doing the heavy lifting. Self-service revocation could
also gain a "remember this device" marker (a cookie with its own `sid`) so the current row
can be highlighted without trusting the request payload.

## Candidate-facing session screen

**Status:** deferred.

`/auth/sessions` already serves candidates (`principalType: candidate`) and the candidate
permission bundle carries `session.read.self` / `session.revoke.self`. The candidate portal
just has no screen for it yet; the recruiter page can be reused almost as-is.
