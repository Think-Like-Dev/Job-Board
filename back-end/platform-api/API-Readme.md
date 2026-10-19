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

Docker (build the migration image):

```sh
docker compose --env-file <env_file_path> --profile migration run --build migrate
```

Docker (run pending migrations):

```sh
docker compose --env-file <env_file_path> --profile migration run --rm migrate
```

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

Docker (build the seed image):

```sh
docker compose --env-file <env_file_path> --profile seed run --build seed
```

Docker (run seeders):

```sh
docker compose --env-file <env_file_path> --profile seed run --rm seed
```