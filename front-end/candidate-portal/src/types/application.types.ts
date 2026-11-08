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
  isDraft?: boolean;
}

/** Query parameters accepted by the candidate application list endpoint. */
export interface ApplicationQueryParams {
  page?: number;
  limit?: number;
  status?: ApplicationStatus;
  jobId?: string;
}

/** Paginated envelope returned by `GET /applications/my`. */
export interface ApplicationListResponse {
  success: boolean;
  message: string;
  data: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApplicationActionResponse {
  success: boolean;
  message?: string;
  applicationId?: string;
}
