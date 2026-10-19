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
  OTHER = 'OTHER',
}
