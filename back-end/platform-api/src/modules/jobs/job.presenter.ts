import type { Job } from './job.schema';
import type { JobSummaryDto } from './job-response.dto';

function toDateOnly(value?: string | Date): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value;
}

/** Maps the persisted job entity to the frontend-facing summary shape. */
export function toJobSummaryDto(job: Job): JobSummaryDto {
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
    department: job.department,
    designation: job.designation,
    benefits: job.benefits ?? [],
    totalInterviewRounds: job.totalInterviewRounds,
    lastApplicationDate: toDateOnly(job.lastApplicationDate),
    createdAt: job.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: job.updatedAt?.toISOString(),
  };
}
