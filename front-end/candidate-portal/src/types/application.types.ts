// Application status constants — use these instead of raw strings to avoid typos.
// Note: regular enum is disallowed by erasableSyntaxOnly; use `as const` objects instead.

export enum ApplicationStatus {
  APPLIED = 'Applied',
  IN_REVIEW = 'In Review',
  INTERVIEW_SCHEDULED = 'Interview Scheduled',
  OFFER_EXTENDED = 'Offer Extended',
  OFFER_ACCEPTED = 'Offer Accepted',
  OFFER_REJECTED = 'Offer Rejected',
  WITHDRAWN = 'Withdrawn',
  REJECTED = 'Rejected',
  DRAFT = 'Draft',
}

export enum InterviewMode {
  IN_PERSON = 'In Person',
  ONLINE = 'Online',
  PHONE = 'Phone Call',
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

export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedAt: string;
  details: ApplicationDetails;
}

export interface ApplyPayload {
  resumeFile?: File;
  coverLetterFile?: File;
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
  applicationId?: string;
}
