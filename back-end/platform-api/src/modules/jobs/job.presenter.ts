import type { Job } from './job.schema';
import type { JobApplicationStats } from '@modules/applications/job-application-stats.service';
import type { JobDetailDto, JobSummaryDto } from './job-response.dto';
import type {
  PublicJobDetailDto,
  PublicJobSummaryDto,
} from './public-job-response.dto';

function toIsoString(value?: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function toDateOnly(value?: string | Date | null): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

/** Maps the persisted job entity to the frontend-facing summary shape. */
export function toJobSummaryDto(
  job: Job,
  stats?: JobApplicationStats,
): JobSummaryDto {
  return {
    id: job.id,
    code: job.code,
    title: job.title,
    category: job.category,
    status: job.status,
    compensation: job.compensation ?? null,
    location: job.location,
    keywords: job.keywords ?? [],
    employmentType: job.employmentType,
    department: job.department ?? undefined,
    designation: job.designation ?? undefined,
    benefits: job.benefits ?? [],
    totalInterviewRounds: job.totalInterviewRounds,
    lastApplicationDate: toDateOnly(job.lastApplicationDate),
    createdAt: job.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: toIsoString(job.updatedAt),
    publishedAt: toIsoString(job.publishedAt),
    archivedAt: toIsoString(job.archivedAt),
    createdBy: job.createdBy,
    totalApplications: stats?.totalApplications,
    candidateStatusCounts: stats?.candidateStatusCounts,
  };
}

/** Adds the fields the edit page and detail drawer need. */
export function toJobDetailDto(
  job: Job,
  stats?: JobApplicationStats,
): JobDetailDto {
  return {
    ...toJobSummaryDto(job, stats),
    description: job.description,
    responsibilities: job.responsibilities ?? '',
    yearsOfExperience: job.yearsOfExperience ?? '',
    vacancies: job.vacancies,
    workMode: job.workMode ?? [],
    workShiftTiming: job.workShiftTiming ?? [],
    skills: job.skills ?? [],
    applicationSettings: job.applicationSettings ?? undefined,
    hiringProcess: job.hiringProcess ?? [],
  };
}

/**
 * Candidate-facing summary. Reuses the internal summary but adds the
 * description snippet and drops internal ownership/lifecycle fields.
 */
export function toPublicJobSummaryDto(job: Job): PublicJobSummaryDto {
  return {
    id: job.id,
    code: job.code,
    title: job.title,
    category: job.category,
    description: job.description,
    location: job.location,
    employmentType: job.employmentType,
    department: job.department ?? undefined,
    designation: job.designation ?? undefined,
    compensation: job.compensation ?? null,
    keywords: job.keywords ?? [],
    benefits: job.benefits ?? [],
    totalInterviewRounds: job.totalInterviewRounds ?? undefined,
    yearsOfExperience: job.yearsOfExperience ?? undefined,
    lastApplicationDate: toDateOnly(job.lastApplicationDate),
    status: job.status,
    createdAt: job.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: toIsoString(job.updatedAt),
    publishedAt: toIsoString(job.publishedAt),
  };
}

/** Candidate-facing detail; reuses the summary and adds the detail fields. */
export function toPublicJobDetailDto(job: Job): PublicJobDetailDto {
  return {
    ...toPublicJobSummaryDto(job),
    responsibilities: job.responsibilities ?? '',
    yearsOfExperience: job.yearsOfExperience ?? '',
    vacancies: job.vacancies,
    workMode: job.workMode ?? [],
    workShiftTiming: job.workShiftTiming ?? [],
    skills: job.skills ?? [],
    applicationSettings: job.applicationSettings ?? undefined,
    hiringProcess: job.hiringProcess ?? [],
  };
}
