// Application status constants mirroring the backend `application_status`
// PostgreSQL enum. Use these instead of raw strings to avoid typos.

export enum ApplicationStatus {
  DRAFT = "DRAFT",
  APPLIED = "APPLIED",
  IN_REVIEW = "IN_REVIEW",
  SHORTLISTED = "SHORTLISTED",
  INTERVIEW = "INTERVIEW",
  OFFER_EXTENDED = "OFFER_EXTENDED",
  OFFER_ACCEPTED = "OFFER_ACCEPTED",
  OFFER_REJECTED = "OFFER_REJECTED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
  AUTO_REJECTED = "AUTO_REJECTED",
}

/**
 * Statuses a recruiter can filter by. Drafts never reach recruiters, and the
 * backend rejects `DRAFT` as a list filter.
 */
export const APPLICATION_FILTER_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.APPLIED,
  ApplicationStatus.IN_REVIEW,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.OFFER_EXTENDED,
  ApplicationStatus.OFFER_ACCEPTED,
  ApplicationStatus.OFFER_REJECTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
  ApplicationStatus.AUTO_REJECTED,
];

export interface ApplicationStatusCount {
  status: ApplicationStatus;
  count: number;
}

export interface ApplicationStatusHistory {
  id: string;
  oldStatus?: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  reason?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface ApplicationFile {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  url: string;
  downloadUrl: string;
}

export interface ApplicationEducation {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  gpa?: string | null;
  additionalDetails?: string | null;
}

export interface ApplicationExperience {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  description?: string | null;
}

export interface ApplicationSkill {
  id: string;
  name: string;
}

export interface ApplicationCertification {
  id: string;
  title: string;
  issuer?: string | null;
  skillId?: string | null;
  skillName?: string | null;
  credentialUrl?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
}

/** Immutable snapshot (or live profile) returned with the application detail. */
export interface ApplicationProfileSnapshot {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  currentLocation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  profileImage?: ApplicationFile | null;
  resume?: ApplicationFile | null;
  coverLetter?: ApplicationFile | null;
  education: ApplicationEducation[];
  experience: ApplicationExperience[];
  skills: ApplicationSkill[];
  certifications: ApplicationCertification[];
  versionNumber?: number;
  capturedAt?: string;
}

export interface RecruiterCandidateSummary {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  profileImageFileId?: string;
  resumeFileId?: string;
}

/** Row shape returned by `GET /jobs/:jobId/applications`. */
export interface JobApplicationListItem {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  resumeFileId: string;
  resumeFileName: string;
  status: ApplicationStatus;
  appliedAt?: string | null;
  createdAt: string;
}

/** Shape returned by `GET /applications/:id`. */
export interface JobApplicationDetail extends JobApplicationListItem {
  profileVersionId?: string;
  profile: ApplicationProfileSnapshot;
  resumeFileUrl: string;
  coverLetterFileId?: string;
  coverLetterFileName?: string;
  coverLetterFileUrl?: string;
  withdrawnAt?: string | null;
  updatedAt?: string;
  candidate: RecruiterCandidateSummary;
  statusHistory: ApplicationStatusHistory[];
}

export interface JobApplicationsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: ApplicationStatus;
  /** `field:direction`, e.g. `appliedAt:DESC`. */
  sortBy?: string;
}
