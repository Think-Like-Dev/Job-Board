// Shared job domain types for the candidate portal.
// These mirror the public jobs API response and filter contract.

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

/** Currency values stored by the recruiter job form. */
export enum Currency {
  USD = '$ USD',
  INR = '₹ INR',
  EUR = '€ EUR',
  AED_DIRH = 'د.إ AED (UAE)',
}

export interface JobCompensation {
  type: CompensationType;
  currency?: string;
  period?: string;
  amount?: number | number[];
}

/** Shape returned by the public job list endpoint. */
export interface JobSummary {
  id: string;
  code: string;
  title: string;
  category: string;
  description: string;
  location: string;
  employmentType: EmploymentType;
  department?: string | null;
  designation?: string | null;
  compensation?: JobCompensation | null;
  keywords: string[];
  benefits?: string[] | null;
  totalInterviewRounds?: number | null;
  yearsOfExperience?: string | null;
  lastApplicationDate?: string | null;
  status: JobStatus;
  createdAt: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

/** Shape returned by the public job detail endpoint. */
export interface JobDetail extends JobSummary {
  responsibilities: string;
  yearsOfExperience: string;
  vacancies: number;
  workMode: WorkMode[];
  workShiftTiming: string[];
  skills: string[];
  applicationSettings?: {
    coverLetterRequired: boolean;
    attachmentsAllowed: boolean;
    maximumAttachments: number;
  };
  hiringProcess?: string[];
}

export interface JobPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface JobListResponse {
  success: boolean;
  message: string;
  data: JobSummary[];
  pagination: JobPagination;
}

export interface JobDetailResponse {
  success: boolean;
  message: string;
  data: JobDetail;
}

/** Query-string filters sent to the public jobs API. */
export interface JobFilters {
  search?: string;
  category?: string;
  location?: string;
  yearsOfExperience?: string;
  currency?: string;
  compensationMin?: number;
  compensationMax?: number;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderByDirection?: 'ASC' | 'DESC';
}

export interface BookmarkPayload {
  jobId: string;
}

export interface BookmarkResponse {
  success: boolean;
  isBookmarked: boolean;
}
