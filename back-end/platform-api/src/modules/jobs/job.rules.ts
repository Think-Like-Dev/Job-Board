import { BadRequestException, ConflictException } from '@nestjs/common';
import { JobStatus } from '@common/constants/enums';

/** Fields required before a draft may go live. */
export interface PublishableJobFields {
  category?: string;
  location?: string;
  description?: string;
  workMode?: string[];
  skills?: string[];
  totalInterviewRounds?: number;
  lastApplicationDate?: string | null;
}

/**
 * Job lifecycle rules live here so the create, update and status flows all
 * enforce the same constraints.
 *
 * DRAFT -> PUBLISHED -> ARCHIVED is the only forward path. Archived jobs are
 * terminal: they cannot be edited, re-published, unarchived or deleted.
 * Unpublishing is deliberately unsupported — recruiters archive instead.
 */
const ALLOWED_TRANSITIONS: Record<JobStatus, readonly JobStatus[]> = {
  [JobStatus.DRAFT]: [JobStatus.PUBLISHED],
  [JobStatus.PUBLISHED]: [JobStatus.ARCHIVED],
  [JobStatus.ARCHIVED]: [],
  [JobStatus.CLOSED]: [],
};

export function assertTransitionAllowed(from: JobStatus, to: JobStatus): void {
  if (to === JobStatus.DRAFT) {
    throw new ConflictException(
      'Jobs cannot be unpublished; archive the job instead',
    );
  }

  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ConflictException(
      `Cannot change job status from ${from} to ${to}`,
    );
  }
}

export function assertPublishable(job: PublishableJobFields): void {
  const missing: string[] = [];
  if (!job.category?.trim()) missing.push('category');
  if (!job.location?.trim()) missing.push('location');
  if (!job.description?.trim()) missing.push('description');
  if (!job.workMode?.length) missing.push('workMode');
  if (!job.skills?.some((skill) => skill.trim())) missing.push('skills');
  if (job.totalInterviewRounds === undefined) {
    missing.push('totalInterviewRounds');
  }
  if (!job.lastApplicationDate?.trim()) {
    missing.push('lastApplicationDate');
  } else if (job.lastApplicationDate < todayIsoDate()) {
    throw new BadRequestException(
      'lastApplicationDate must be today or in the future',
    );
  }

  if (missing.length) {
    throw new BadRequestException(
      `Missing required fields for publishing: ${missing.join(', ')}`,
    );
  }
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
