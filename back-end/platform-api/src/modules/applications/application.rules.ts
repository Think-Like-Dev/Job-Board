import { ConflictException } from '@nestjs/common';
import { ApplicationStatus, JobStatus } from '@common/constants/enums';
import type { Job } from '@modules/jobs/job.schema';

/**
 * Workflow importance used to order the recruiter dashboard's top status
 * counts. Keep this list aligned with `ApplicationStatus`.
 */
export const APPLICATION_STATUS_IMPORTANCE: readonly ApplicationStatus[] = [
  ApplicationStatus.OFFER_ACCEPTED,
  ApplicationStatus.OFFER_EXTENDED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.IN_REVIEW,
  ApplicationStatus.APPLIED,
  ApplicationStatus.OFFER_REJECTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.WITHDRAWN,
  ApplicationStatus.AUTO_REJECTED,
];

export interface ApplicationStatusCount {
  status: ApplicationStatus;
  count: number;
}

/** A job accepts applications only while published and before its deadline. */
export function assertJobAcceptsApplications(job: Job): void {
  if (job.status !== JobStatus.PUBLISHED) {
    throw new ConflictException('This job is not accepting applications');
  }

  const today = new Date().toISOString().slice(0, 10);
  if (job.lastApplicationDate && job.lastApplicationDate < today) {
    throw new ConflictException(
      'The application window for this job has closed',
    );
  }
}

/**
 * Only a draft can be submitted or updated. Once an application leaves
 * `DRAFT` it can never be edited or re-submitted.
 */
export function assertCanApply(existingStatus?: ApplicationStatus): void {
  if (existingStatus && existingStatus !== ApplicationStatus.DRAFT) {
    throw new ConflictException('Already applied for this job');
  }
}

/** Withdrawal is allowed only before a recruiter starts reviewing. */
export function assertWithdrawable(status: ApplicationStatus): void {
  if (status !== ApplicationStatus.APPLIED) {
    throw new ConflictException(
      'Only applications in APPLIED status can be withdrawn',
    );
  }
}

/** Drafts are hard-deleted; submitted applications are never deleted. */
export function assertDraftDeletable(status: ApplicationStatus): void {
  if (status !== ApplicationStatus.DRAFT) {
    throw new ConflictException('Only draft applications can be deleted');
  }
}

/** Keeps the three most workflow-important non-zero status counts. */
export function topStatusCounts(
  counts: ApplicationStatusCount[],
  limit = 3,
): ApplicationStatusCount[] {
  const rank = new Map(
    APPLICATION_STATUS_IMPORTANCE.map((status, index) => [status, index]),
  );

  return counts
    .filter((entry) => entry.count > 0)
    .sort(
      (a, b) =>
        (rank.get(a.status) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.status) ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, limit);
}
