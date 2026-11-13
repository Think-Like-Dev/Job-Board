# Recruitment Board Portal – Backend Architecture & Implementation Prompt

This specification document serves as the **master engineering prompt and architectural blueprint** for building the enterprise backend of the **Recruitment Board Portal** using **NestJS**, **Express**, **PostgreSQL**, and **MikroORM**.

---

## 1. Executive Summary & Core Principles

The backend provides a secure, highly scalable RESTful API and Server-Sent Events (SSE) streaming engine serving both the **Candidate Portal** and the **Recruiter Portal**.

### Engineering Principles

* **SOLID Architecture:** Strict separation of concerns (Controllers $\rightarrow$ Services $\rightarrow$ Repositories $\rightarrow$ Entities).
* **DRY & Generic Factory Pattern:** Reusable Generic CRUD controllers, services, and repositories to eliminate repetitive boilerplate for standard CRUD operations and paginated listings.
* **Type-Safety (TypeScript 6+):** Heavy reliance on strict typing, Enums, Generics (`T`), Utility types (`Omit`, `Pick`, `Partial`), and Discriminated Unions.
* **Cookie-Based Session Auth (No JWT):** Stateful session management backed only by Redis, with secure `HttpOnly` cookies, session invalidation, and OTP verification.
* **Auto-Generated Swagger Docs:** Comprehensive OpenAPI annotation for every endpoint, request DTO, and response schema.

---

## 2. Tech Stack Specification

| Component | Technology | Version / Tooling |
| --- | --- | --- |
| **Framework** | NestJS | v12+ (Express HTTP Platform) |
| **Language** | TypeScript | v6+ (strict typing; current `tsconfig` still relaxes `noImplicitAny`) |
| **Database** | PostgreSQL | v18+ |
| **ORM** | MikroORM | v7 (`@mikro-orm/core`, `@mikro-orm/postgresql`, `@mikro-orm/nestjs`, `@mikro-orm/migrations`) |
| **Session / OTP Store** | Redis | `ioredis` (TTL-based sessions and OTPs) |
| **Validation** | Class-Validator & Class-Transformer | DTO input validation & transformation |
| **Documentation** | Swagger / OpenAPI | `@nestjs/swagger` |
| **Template Engine** | Handlebars / EJS | Email template rendering |
| **Real-Time** | RxJS / Server-Sent Events | NestJS `@Sse()` streams |

---

## 3. Example Project Directory Structure

```text
src/
├── common/
│   ├── constants/            # Global Enums & Application Constants
│   ├── decorators/           # Custom Decorators (@CurrentUser, @Public, @Roles)
│   ├── dto/                  # Universal DTOs (Pagination, Sorting, Bulk Actions)
│   ├── factory/              # Abstract Generic CRUD Factory (Controller, Service, Repository)
│   ├── filters/              # Global Exception Filters (MikroORM, HTTP, Validation)
│   ├── guards/               # Auth Guard, Session Guard, Role Guard
│   ├── interceptors/         # Response Formatting & Logging Interceptors
│   └── interfaces/           # Shared Generic Interfaces
├── config/                   # Configuration Loader & Validation (Database, Mail, App)
├── database/                 # MikroORM config + migration CLI config
├── migrations/               # MikroORM migration classes (schema source)
├── modules/
│   ├── auth/                 # Auth, Sessions, OTP Verification
│   ├── users/                # User Management & Roles
│   ├── candidates/           # Candidate Profiles, Resumes, Education, Experience
│   ├── jobs/                 # Job Postings, Skills, & Dynamic Application Questions
│   ├── applications/         # Job Applications, Dynamic Answers, Audit Trail
│   ├── interviews/           # Round Scheduling, Interviewer Assignment, Feedback
│   ├── offers/               # Offer Generation, Deadline Monitoring, Auto-Rejection
│   ├── emails/               # WYSIWYG Templates, Mailer Engine, Logs
│   ├── notifications/        # Candidate Notifications & SSE Controller
│   └── activity-logs/        # System Audit Logging
└── app.module.ts

```

The `common/generic/` folder will contain generator patterns of functions or classes for CRUD operations ,repositories and DTOs.  
Each module will have it's own controller , services , repository and DTO's. They may contain extra business logic or extended methods or overridden version of `common/factory/generic-crud-controller.ts`, `common/factory/generic-crud-service.ts` and `common/factory/generic-crud.repository.ts`.

Schema changes use MikroORM migrations (`src/migrations`, CLI config `src/database/mikro-orm.cli.config.ts`). Run `pnpm migration:up`, `pnpm migration:down`, `pnpm migration:create`, or `pnpm migration:check`. The initial migration covers `users`, `candidates`, and `files`; `recruitment_db.sql` remains the reference for planned modules.

---

## 4. Example  Generic CRUD Factory & DRY Architecture

To maximize code reusability, standard entities leverage a **Generic CRUD Factory Pattern**.

### 4.1 Universal Pagination DTO & Interface

```typescript
// common/interfaces/paginated-result.interface.ts
export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

// common/dto/pagination-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'createdAt:DESC' })
  @IsString()
  @IsOptional()
  sortBy?: string;
}

```

### 4.2 Reusable Generic Base Service

```typescript
// common/factory/generic-crud.service.ts
import {
  EntityRepository,
  FilterQuery,
  FindOptions,
  RequiredEntityData,
} from '@mikro-orm/core';
import { NotFoundException } from '@nestjs/common';
import { IPaginatedResult } from '../interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

export abstract class GenericCrudService<
  Entity extends object,
  CreateDto extends object,
  UpdateDto extends object
> {
  constructor(protected readonly repository: EntityRepository<Entity>) {}

  async create(createDto: CreateDto): Promise<Entity> {
    const entity = this.repository.create(createDto as RequiredEntityData<Entity>);
    const em = this.repository.getEntityManager();
    em.persist(entity);
    await em.flush();
    return entity;
  }

  async findAllPaginated(
    query: PaginationQueryDto,
    where: FilterQuery<Entity> = {},
    options: FindOptions<Entity> = {}
  ): Promise<IPaginatedResult<Entity>> {
    const { page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    const [data, totalItems] = await this.repository.findAndCount(where, {
      ...options,
      limit,
      offset,
    });

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findOneById(id: string, options: FindOptions<Entity> = {}): Promise<Entity> {
    const entity = await this.repository.findOne({ id } as unknown as FilterQuery<Entity>, options);
    if (!entity) {
      throw new NotFoundException(`Resource with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: string, updateDto: UpdateDto): Promise<Entity> {
    const entity = await this.findOneById(id);
    this.repository.assign(entity, updateDto as any);
    await this.repository.getEntityManager().flush();
    return entity;
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOneById(id);
    const em = this.repository.getEntityManager();
    em.remove(entity);
    await em.flush();
  }
}

```

> MikroORM v7 removed the `*AndFlush` helpers; always call `persist()`/`remove()` and then `flush()`.

---

## 5. Domain Enums & Schema Definitions

All domain constants map 1:1 with PostgreSQL ENUMs. Refer front end Readmes and relevant sql file to understand full enum values

```typescript
// common/constants/enums.ts
 enum UserRole 
 enum JobStatus 
 enum EmploymentType 
 enum ApplicationStatus 
 enum InterviewMode 
 enum InterviewStatus 
 enum OfferStatus 
 enum QuestionType 
 enum EmailStatus 
 enum FileType 
```

---

## 6. Key Feature Implementation Specifications

### 6.1 Cookie-Based Session Auth & Guards

* **No JWTs:** Session tokens are opaque random strings stored in Redis (`session:<token>`) with a TTL. No session rows are written to PostgreSQL.
* **Cookie Management:** Cookies written via Express response with flags: `HttpOnly`, `Secure` (in production), `SameSite=Lax`, `Path=/`.
* **Endpoints:**
  * `POST /api/auth/otp/request` — `{ email }`; issues a candidate OTP for signup/login.
  * `POST /api/auth/login` — `{ email, password }`; recruiter step 1, verifies the argon2 password and sends an OTP. No session is created yet.
  * `POST /api/auth/otp/verify` — `{ email, otp }`; completes either flow. The OTP record stores `CANDIDATE` or `RECRUITER`, so the role cannot be swapped. Creates the Redis session, sets the cookie, and returns `{ user }`.
  * `GET /api/auth/me` — guarded; returns the current principal as `{ user }`.
  * `POST /api/auth/logout` — deletes the Redis session and clears the cookie.
* **Guard Mechanics:** `SessionAuthGuard` reads the `session_token` cookie, looks up `session:<token>` in Redis, validates the stored payload (`principalType`, `principalId`, `email`, `role`), and attaches `req.session`. The controller/consumer loads the principal from `users` or `candidates`; `GET /api/auth/me` does this and returns 401 when the principal no longer exists. Missing/expired keys are unauthorized.
* **OTP Verification:** 6-digit OTP stored only in Redis (`otp:<email>`) with a 5-minute TTL for candidate login/signup and recruiter authentication. In local development a fixed OTP (`123456`) is used for testing; staging and production generate random OTPs.

### 6.2 Dynamic Form Engine (Google Forms Style)

* Recruiters construct questions stored in `job_application_questions` linked to `question_options`.
* During application submission, `application_answers` records raw responses linked back to `question_id`.
* The backend enforces runtime validation against `validation_rules` (JSON object defining `minLength`, `maxLength`, `regex`, `required`, etc.).

### 6.3 Bulk Interview Round Progression Pipeline

When a recruiter initiates a round advancement:

1. **Transaction Isolation:** Execute within a single MikroORM transaction (`em.transactional()`).
2. **Progression Logic:**
* Fetch selected application IDs for the job's current round.
* Advance selected applications to the next round / status (`INTERVIEW` / `IN_REVIEW`).
* Identify unselected candidates in the current round and update status to `REJECTED` with reason `"Not shortlisted for round progression"`.
* Update job's current interview round state.


3. **Automated Queueing:** Emit background job events to generate bulk emails via Handlebars email templates and push dynamic updates to `notifications`.

### 6.4 Real-Time Notification Engine (SSE)

* **Endpoint:** `GET /api/notifications/stream`
* **Mechanics:** Receives the session cookie (or a query token because `EventSource` cannot set headers), resolves it against the Redis session store, streams notification events via an RxJS `Observable` pipeline, and terminates/flushes connections gracefully.

### 6.5 Jobs Lifecycle API

All `/api/jobs` routes are session-guarded and require an internal user session (`principalType: "user"`). Reads are open to every internal user; writes are restricted to the recruiter who created the job (`jobs.created_by`).

The candidate portal uses a separate **unauthenticated** read-only surface, `GET /api/public/jobs` and `GET /api/public/jobs/:id`. It reuses the same service functions with `publicOnly` enabled, so results are limited to `PUBLISHED` jobs whose `lastApplicationDate` is today or later. Public responses omit internal ownership/lifecycle fields and include the job `description` in the summary.

* **`GET /api/jobs`** — paginated list. Query: `page`, `limit`, `search`, `status`, `recruiterId`, `category`, `location`, `yearsOfExperience`, `currency`, `compensationType` (`NEGOTIABLE` | `NONE`), `compensationMin` / `compensationMax` (salary-range overlap; a fixed salary counts as min = max), `orderBy` (`createdAt` | `updatedAt` | `title` | `status` | `code` | `location` | `category` | `compensation` | `publishedAt`), `orderByDirection` (`ASC` | `DESC`). `search` matches title, code, category or location; `compensation` sorting uses the fixed amount or range minimum with nulls last. Soft-deleted drafts are excluded. Each summary includes `createdBy`, `publishedAt`, and `archivedAt` so the client can gate creator-only actions and show lifecycle timestamps. Recruiter responses also include `totalApplications` and `candidateStatusCounts` (see §6.7).
* **`GET /api/public/jobs`** — same pagination, search, sorting and filters as `GET /api/jobs`, but unauthenticated and published-only. `status` and `recruiterId` are ignored. Each item is a `PublicJobSummaryDto` (no `createdBy`/`archivedAt`, includes `description`).
* **`GET /api/public/jobs/:id`** — public job detail. Returns `404` when the job is not published, has been soft-deleted, or its application window has passed.
* **`POST /api/jobs`** — create a `DRAFT` or `PUBLISHED` job.
* **`GET /api/jobs/:id`** — full job detail, including the fields the edit page and detail drawer need. It also returns `createdBy` and the lifecycle timestamps.
* **`PUT /api/jobs/:id`** — replace a draft's editable fields. `status` is optional: omit it to keep the draft, or send `PUBLISHED` to save-and-publish in one call. Published and archived jobs return `409 Conflict`.
* **`PATCH /api/jobs/:id/status`** — `{ status: "PUBLISHED" | "ARCHIVED", acknowledgeNoConfirmedOffers?: boolean }`. `DRAFT -> PUBLISHED -> ARCHIVED` is the only path; archived is terminal and unpublishing is rejected.
* **`GET /api/jobs/:id/archive-preview`** — `{ confirmedOffersCount, requiresNoConfirmedOffersAcknowledgement }`. When the count is zero the client must show the irreversible warning and resend the archive request with `acknowledgeNoConfirmedOffers: true`.
* **`DELETE /api/jobs/:id`** — soft-delete a draft (`deleted_at`). Drafts only; the row is retained.

**Lifecycle rules**

* Drafts can be edited, published, or soft-deleted.
* Published jobs cannot be edited or deleted; they can only be archived — manually, or automatically once `last_application_date` has passed. `JobsExpiryService` sweeps daily at midnight and on startup.
* Archived jobs are immutable: no edits, status changes, or deletes.
* Every delete operation in the application is a soft delete.
* Publishing requires `category`, `location`, `description`, `workMode`, `skills`, `totalInterviewRounds`, and a `lastApplicationDate` that is today or later.

### 6.6 Object Storage (Garage S3)

Uploaded files (resumes, cover letters, offer letters, profile images) live in a **single Garage bucket**; PostgreSQL `files` rows only store metadata plus the object key in `storage_path`. One bucket is used per environment, and file kinds are separated by path prefix:

| FileType | Object prefix |
| :--- | :--- |
| `RESUME` | `resumes/` |
| `COVER_LETTER` | `cover-letters/` |
| `OFFER_LETTER` | `offer-letters/` |
| `PROFILE_IMAGE` | `profile-images/` |
| `OTHER` | `other/` |

**Code**

* `S3StorageService` (`src/modules/files/s3-storage.service.ts`) wraps `@aws-sdk/client-s3`; `getFile(key)` opens an object stream.
* `FilesService.registerAndUpload(file, fileType, session)` uploads the buffer, then inserts the `files` row with `owner_type`/`owner_id` taken from the session.
* `FilesService.openFileForSession(id, session)` checks access and returns the object stream.
* `FilesService.removeForSession(id, session)` checks ownership before deleting the row and the Garage object.
* `S3StorageService.getSignedDownloadUrl(key)` is reserved for server-to-server use (for example the future AI service) and is **never** returned by a public route.

**Files API and access control**

Every `/api/files` route is session-guarded with `SessionAuthGuard`. There is no public file route, and no endpoint returns a raw Garage URL.

| Route | Access |
| :--- | :--- |
| `POST /api/files` | Any authenticated principal; the owner is the session, never client input. Multipart `file` + `fileType`. |
| `GET /api/files` | Candidate: own files plus files explicitly shared with them. Internal users: all files. |
| `GET /api/files/:id` | Candidate: own files plus files explicitly shared with them. Internal users: all files. |
| `GET /api/files/:id/content` | Same rule as metadata; bytes stream through the API. |
| `DELETE /api/files/:id` | Uploader only. |
| `POST /api/files/:id/grants` | Internal users only. Body `{ "candidateId": "<uuid>" }`. Shares the file with one candidate. |
| `DELETE /api/files/:id/grants/:candidateId` | Internal users only. Revokes the candidate's read grant. |

Ownership lives in `files.owner_type` (`CANDIDATE` | `USER`) and `files.owner_id`. The pair is polymorphic, so a check constraint enforces both-or-neither instead of a foreign key. Files with no owner are legacy/system rows: internal users may read and manage them; candidates cannot see them.

Recruiter-provided files (for example offer letters) are shared through `file_access_grants` (`file_id`, `candidate_id`, `granted_by`, `created_at`). A grant is additive and revocable: it never changes the file owner. Candidates can read a granted file but still cannot delete or mutate it. When the Offers module lands, creating an offer can call `FileAccessGrantsService.grant()` for the offer document, or the read policy can be extended to check `offers.offer_file_id`.

`GET /api/files/:id/content` streams the object through the API instead of redirecting to Garage, so every read is covered by the `session_token` cookie. The response uses `Content-Disposition: inline` with a sanitized filename; add `?download=true` to force `Content-Disposition: attachment`. Metadata responses never expose `storage_path` or `owner_id`. Uploads are capped at 10 MB.

**Environment**

* `S3_ENDPOINT` — `http://garage:3900` inside Compose, `http://localhost:3900` for a host-run API.
* `S3_REGION` — `garage`.
* `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` — imported by `garage-init`.
* `S3_BUCKET_NAME` — `jobboard-files`.
* `S3_FORCE_PATH_STYLE` — `true` (Garage uses path-style S3).
* `S3_SIGNED_URL_EXPIRY_SECONDS` — lifetime for internal presigned URLs (default `900`). User-facing reads stream through the API instead.

**Compose services**

* `garage` — Garage server (S3 API `3900`, admin API `3903`, RPC `3901`).
* `garage-init` — one-shot bootstrap: assigns the single-node layout, imports the fixed S3 key, creates the bucket, and grants read/write/owner. Safe to re-run.
* `garage-webui` — optional debug-profile file browser on `http://localhost:3909`.

The official Garage image is **distroless** (no `/bin/sh`), so the multi-step bootstrap cannot run inside it. `garage/Dockerfile.init` copies the static `/garage` binary into a small Alpine image with a shell. `garage-init` shares Garage's network namespace so the CLI can reach the node on `127.0.0.1:3901`.

**Volumes**

Garage data is isolated per environment, matching Postgres/Redis:

* local — `job-board-local-garage-data`
* staging — `job-board-staging-garage-data`
* production — `job-board-prod-garage-data`

**Start / verify**

Deployment commands (first-time bootstrap, restart, web UI) live in
[`infrastructure/docker/README.md`](../infrastructure/docker/README.md) §2.1 and §2.3. In
short: `garage` must be up and `garage-init` must have run once per volume before any upload
works.

**Web UI (debug profile)**

`garage-webui` is gated behind the `debug` profile, listens on `http://localhost:3909`, reads
`garage/garage.toml`, and talks to the admin API at `http://garage:3903`. Optional basic auth
can be enabled with `GARAGE_WEBUI_AUTH` (`username:bcrypt-hash` from `htpasswd -nbBC 10 user
pass`). The UI is not started by default; see the runbook above.

**Quirks**

* A fresh Garage node has no layout; `garage-init` assigns `dc1` with 10G and applies version 1.
* Buckets and keys are not auto-created by Garage; `garage-init` handles both.
* `garage.toml` currently contains local-development secrets. Replace `rpc_secret`, `admin_token`, `metrics_token`, and the S3 credentials before using staging/production.

### 6.7 Applications API

Application statuses use the native `application_status` enum: `DRAFT`, `APPLIED`, `IN_REVIEW`, `SHORTLISTED`, `INTERVIEW`, `OFFER_EXTENDED`, `OFFER_ACCEPTED`, `OFFER_REJECTED`, `REJECTED`, `WITHDRAWN`, `AUTO_REJECTED`. The `(candidate_id, job_id)` pair is unique: a draft and its submitted form are the same row.

**Candidate routes** (`principalType: "candidate"`)

* **`POST /api/jobs/:jobId/apply`** — `multipart/form-data`: optional `resumeFile`, `coverLetterFile`; fields `isDraft` (default `false`), `updateProfileResume` (default `false`), `existingResumeFileId` (UUID). Rules: the job must be `PUBLISHED` and not past `lastApplicationDate`; an existing `DRAFT` may be updated or submitted; any later status returns `409`. Resume: PDF/DOCX ≤ 2 MB; cover letter: PDF/DOCX ≤ 1 MB; `applicationSettings.coverLetterRequired` is enforced on submit. Resume resolution order: new upload, `existingResumeFileId`, the draft's resume, then `candidates.resume_file_id`; if none exists the request is `400`. `updateProfileResume` updates `candidates.resume_file_id` only on submit and only when a new resume was uploaded.
* **`GET /api/applications/my`** — paginated (`page`, `limit`, optional `status`), newest first, includes drafts.
* **`GET /api/applications/my/:id`** — the candidate's own application with `statusHistory`.
* **`POST /api/applications/:id/withdraw`** — `{ reason?: string }`; only from `APPLIED`, sets `withdrawn_at`, writes a history row. Later statuses return `409`.
* **`DELETE /api/applications/:id`** — hard-deletes a `DRAFT` and its history; files used only by the draft are removed unless the candidate profile or another application still references them.

**Recruiter routes** (any internal user: `principalType: "user"`)

* **`GET /api/jobs/:jobId/applications`** — paginated (`page`, `limit`, optional `status`, `search` over first name/last name/email), `appliedAt` newest first. Drafts are excluded; requesting `status=DRAFT` is `400`.
* **`GET /api/applications/:id`** — candidate profile fields, resume/cover-letter references, and `statusHistory`. Returns `404` for a draft so it is not revealed.

**File access and links**

Application responses return `resumeFileId`, `resumeFileName`, `resumeFileUrl` (and cover-letter equivalents). URLs are API-relative (`/files/:id/content?download=true`) and remain session-guarded; the browser never receives a Garage URL. `GET /api/files/:id/content?download=true` sets `Content-Disposition: attachment`.

**Job stats**

`GET /api/jobs` and `GET /api/jobs/:id` attach `totalApplications` (every non-`DRAFT` application) and `candidateStatusCounts` (top three non-zero statuses by workflow importance: `OFFER_ACCEPTED`, `OFFER_EXTENDED`, `INTERVIEW`, `SHORTLISTED`, `IN_REVIEW`, `APPLIED`, `OFFER_REJECTED`, `REJECTED`, `WITHDRAWN`, `AUTO_REJECTED`). Stats are computed with one grouped query per page by `ApplicationStatsModule`, which depends only on the Application entity to avoid a cycle with `JobsModule`.

**Deferred**

Recruiter status mutations, extra attachments, email/notification sending, and dynamic question answers are not part of Phase 2.

---

## 7. Swagger Documentation Standards

All endpoints must be fully documented using `@nestjs/swagger` decorators:

* Every DTO field must use `@ApiProperty()` or `@ApiPropertyOptional()` with explicit `type`, `example`, and `enum` declarations.
* Controllers must utilize `@ApiTags()`, `@ApiOperation()`, `@ApiResponse({ status: 200 })`, and `@ApiResponse({ status: 400 })`.
* Error responses must follow a unified structure:

```json
{
  "statusCode": 400,
  "message": ["email must be an email address", "password is too short"],
  "error": "Bad Request",
  "timestamp": "2026-08-02T19:38:31.000Z",
  "path": "/api/auth/login"
}

```

---

## 8. Backend Engineering Requirements

1. **Strict Type Safety:** Avoid explicit or implicit `any`. Use generic parameters, interfaces, and union types across all modules.
2. **MikroORM Integration:** MikroORM v7 uses `EntitySchema` (decorators were removed), with entity definitions in `*.schema.ts` files discovered by glob. Map tables, columns, and relations to the SQL relational schema using the `EntitySchema` property API.
3. **Database Integrity:** Use Foreign Key constraints with standard cascading and `ON DELETE RESTRICT` rules.
4. **Validation Pipeline:** Global `ValidationPipe` enabled with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`.
5. **Clean Code Guidelines:** Adhere to `DRY`, `SOLID`, `KISS` and other solid software principles.
6. **Controllers:** Controllers must expose clear public interfaces and delegate business logic away from controllers into dedicated service layers.
7. **Services:** Services must be pure functions containing business logic and should not have any side effects and must be testable.
8. **Repositories:** Repositories should be used to perform database operations and should not have any business logic.
9. **Models:** Models should be used to represent database entities and should not have any business logic.
10. **DTOs:** DTOs should be used to transfer data between layers and should not have any business logic.
11. **Do not write any Test code** , testing unit codes will be written later.
12. **Write comments only for very complex logic implementation**, however the code should be self-explanatory.
13. **API and Schemas** should be swagger documented.
14. All of the above are just guidelines, you can make changes as you see to fit the scope and database schema structure.

## Database migrations

CLI:

```sh
pnpm migration:up
pnpm migration:down
pnpm migration:create
pnpm migration:check
```

`Migration20261019000000` covers `users`, `candidates`, and `files`; `Migration20261021000000` adds `jobs`; `Migration20261104000000` adds the job lifecycle columns `published_at`, `archived_at`, and `deleted_at`.

## Seed data

The default seeder creates three internal users:

| Role | Email |
| --- | --- |
| `ADMIN` | `admin@jobboard.local` |
| `RECRUITER` | `recruiter@jobboard.local` |
| `HIRING_MANAGER` | `hiring.manager@jobboard.local` |

The password comes from `SEED_DEFAULT_PASSWORD`. In local development it falls back to `ChangeMe123!` when unset; staging and production require the variable. The seeder is idempotent and skips existing emails.

CLI:

```sh
pnpm seed:run
pnpm seed:create <SeederName>
```


## Container workflows

Container start/build/migrate/seed commands for local, staging and production live in
[`infrastructure/docker/README.md`](../infrastructure/docker/README.md). It covers the
first-run order, Garage bootstrap, profiles, volumes and per-environment quirks.

Two things that trip people up:

- In staging/production the image contains only `dist/`, so the compose file runs the
  `:dist` script variants (`pnpm migration:up:dist`, `pnpm seed:run:dist`). You do not pass
  the script name yourself when using the `migrate` / `seed` services.
- Migrations support `down` and up-to/down-to a specific revision; append `:dist` when the
  command runs inside a built image.

| Scope | Command |
| :--- | :--- |
| Migration up one version | `pnpm run migration:up` |
| Migration down one version | `pnpm run migration:down` |
| Migration up until a file | `pnpm run migration:up --to <filename>` |
| Migration down until a file | `pnpm run migration:down --to <filename>` |
