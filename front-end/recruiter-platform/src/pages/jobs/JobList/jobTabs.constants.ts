import { JobStatus } from "@/types/job.types";

export type JobTabKey = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Ordered list page tabs and the status each one queries. */
export const JOB_TABS: readonly JobTabKey[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];

export const JOB_TAB_STATUS: Record<JobTabKey, JobStatus> = {
  DRAFT: JobStatus.DRAFT,
  PUBLISHED: JobStatus.PUBLISHED,
  ARCHIVED: JobStatus.ARCHIVED,
};
