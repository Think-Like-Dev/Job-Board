// Application status constants — these mirror the backend `application_status`
// PostgreSQL enum. Use them instead of raw strings to avoid typos.
// Note: regular enum is disallowed by erasableSyntaxOnly; use `as const` objects instead.

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

export interface InterviewDetails {
  interviewRound: string; // e.g. "1 of 4"
  scheduledAt: string;
  mode: InterviewMode;
  location: string; // address for in-person, meet link for online, interviewer name for phone
}

export interface OfferDetails {
  offerExtendedAt: string;
  offerDeadline: string;
  offerLink?: string;
}

export interface RejectionDetails {
  reason: string;
}

export interface WithdrawnDetails {
  withdrawnAt: string;
}

export type ApplicationDetails =
  | InterviewDetails
  | OfferDetails
  | RejectionDetails
  | WithdrawnDetails
  | Record<string, unknown>;

export interface ApplicationStatusHistory {
  id: string;
  oldStatus?: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

/** Candidate-facing application card, matching `CandidateApplicationSummaryDto`. */
export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  jobCategory: string;
  jobLocation: string;
  status: ApplicationStatus;
  appliedAt?: string | null;
  createdAt: string;
  withdrawnAt?: string | null;
  resumeFileId: string;
  resumeFileName: string;
  resumeFileUrl: string;
  coverLetterFileId?: string;
  coverLetterFileName?: string;
  coverLetterFileUrl?: string;
  /** Not part of the list payload; present on the detail endpoint. */
  details?: ApplicationDetails;
}

export interface ApplicationDetail extends Application {
  updatedAt?: string;
  statusHistory: ApplicationStatusHistory[];
}

export interface ApplyPayload {
  /** Job-specific resume upload; replaces the central resume for this application. */
  resumeFile?: File;
  /** Job-specific cover letter upload. */
  coverLetterFile?: File;
  /** Reuse an already-uploaded candidate resume instead of uploading again. */
  existingResumeFileId?: string;
  /** Submit-time only: replace the central resume with the job-specific upload. */
  updateProfileResume?: boolean;
  /** Submit-time only: replace the central cover letter with the job-specific upload. */
  updateProfileCoverLetter?: boolean;
  answers?: Record<string, unknown>;
  isDraft?: boolean;
}

export interface OfferResponsePayload {
  accept: boolean;
  reason?: string;
  acceptanceDocFile?: File;
}

export interface ApplicationActionResponse {
  success: boolean;
  message?: string;
  applicationId?: string;
}
