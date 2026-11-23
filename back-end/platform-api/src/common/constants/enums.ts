// ─── Application-wide enums ──────────────────────────────────────────────────
// These map 1:1 to the PostgreSQL ENUM types defined in Job-Board-up-v1.sql.

export enum UserRole {
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  HIRING_MANAGER = 'HIRING_MANAGER',
}

/** Role of the party acting during an auth/session flow. */
export enum AuthRole {
  CANDIDATE = 'CANDIDATE',
  RECRUITER = 'RECRUITER',
}

/** Lifecycle of an internal user account (recruiter, admin, manager). */
export enum UserStatus {
  /** Created by an invite; no password yet, cannot sign in. */
  INVITED = 'INVITED',
  /** Onboarded and able to sign in. */
  ACTIVE = 'ACTIVE',
  /** Blocked by an admin; keeps the record, loses access. */
  SUSPENDED = 'SUSPENDED',
}

export enum JobStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
}

export enum WorkMode {
  ON_SITE = 'ON_SITE',
  HYBRID = 'HYBRID',
  REMOTE = 'REMOTE',
}

export enum CompensationType {
  FIXED = 'FIXED',
  RANGE = 'RANGE',
  NEGOTIABLE = 'NEGOTIABLE',
}

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  APPLIED = 'APPLIED',
  IN_REVIEW = 'IN_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  INTERVIEW = 'INTERVIEW',
  OFFER_EXTENDED = 'OFFER_EXTENDED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  AUTO_REJECTED = 'AUTO_REJECTED',
}

export enum InterviewMode {
  ONLINE = 'ONLINE',
  IN_PERSON = 'IN_PERSON',
  PHONE_CALL = 'PHONE_CALL',
}

export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum QuestionType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  RADIO = 'RADIO',
  CHECKBOX = 'CHECKBOX',
  DROPDOWN = 'DROPDOWN',
  DATE = 'DATE',
  NUMBER = 'NUMBER',
  FILE = 'FILE',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export enum EmailStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum FileType {
  RESUME = 'RESUME',
  COVER_LETTER = 'COVER_LETTER',
  OFFER_LETTER = 'OFFER_LETTER',
  PROFILE_IMAGE = 'PROFILE_IMAGE',
  CERTIFICATION = 'CERTIFICATION',
  OTHER = 'OTHER',
}

/**
 * Principal that uploaded a file. Mirrors `SessionPayload.principalType`
 * (candidates are not users; internal users are recruiters/admins/hiring
 * managers).
 */
export enum FileOwnerType {
  CANDIDATE = 'CANDIDATE',
  USER = 'USER',
}

/**
 * Lifecycle of a record in the transactional outbox.
 *
 * - `PENDING` — waiting to be published (or waiting for the next retry).
 * - `PUBLISHED` — the broker acknowledged the message.
 * - `FAILED` — publishing failed too many times; the record is kept for
 *   inspection instead of being deleted.
 */
export enum OutboxStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

/**
 * State of the AI score the recruiter sees for an application.
 *
 * - `PENDING` - a scoring run was queued; the result has not arrived yet.
 * - `SCORED` - the AI scored the application and wrote the assessment.
 * - `SCORE_ONLY` - the AI produced a number but no narrative, because no
 *   language model was available and only the deterministic score was
 *   computed.
 * - `FAILED` - the AI gave up; the reason is stored with the row.
 */
export enum AiScoreStatus {
  PENDING = 'PENDING',
  SCORED = 'SCORED',
  SCORE_ONLY = 'SCORE_ONLY',
  FAILED = 'FAILED',
}
