import type { Job } from '@modules/jobs/job.schema';
import type { ProfileView } from '@modules/profiles/profile.types';

/**
 * The event the AI service consumes to score one application.
 *
 * The payload is deliberately "fat but bounded": it carries everything the
 * consumer needs so it never has to call the core API, but it never carries
 * the resume itself — the AI service downloads the bytes from object storage
 * using `resume.storageKey`.
 */
export interface ApplicationScoringEvent {
  applicationId: string;
  candidateId: string;
  jobId: string;
  jobCode: string;
  jobTitle: string;
  jobDescriptionText: string;
  /**
   * The recruiter's own skill list. It lets the AI service build a job spec
   * without a language model, so the pipeline still runs (degraded) when no
   * model is configured.
   */
  jobSkills: string[];
  jobYearsOfExperience: string | null;
  /**
   * The language the AI writes its narrative in. The recruiter's UI language,
   * so a Tamil-speaking recruiter reads a Tamil summary.
   */
  outputLanguage: string;
  /** The candidate's profile as it was when the application was submitted. */
  profileSnapshot: ProfileView;
  resume: {
    fileId: string;
    storageKey: string;
    filename: string | null;
    mimeType: string | null;
  };
}

/**
 * Flattens a job into the text the AI service analyses.
 *
 * The job's own fields are the source of truth: a published job cannot be
 * edited, so this text is stable for the lifetime of the job.
 */
export function buildJobDescriptionText(job: Job): string {
  const parts: string[] = [];

  parts.push(`Job title: ${job.title}`);
  if (job.code) {
    parts.push(`Job code: ${job.code}`);
  }
  if (job.category) {
    parts.push(`Category: ${job.category}`);
  }
  if (job.location) {
    parts.push(`Location: ${job.location}`);
  }
  if (job.description) {
    parts.push(`Description:\n${job.description}`);
  }
  if (job.responsibilities) {
    parts.push(`Responsibilities:\n${job.responsibilities}`);
  }
  if (job.skills?.length) {
    parts.push(`Required skills: ${job.skills.join(', ')}`);
  }
  if (job.keywords?.length) {
    parts.push(`Keywords: ${job.keywords.join(', ')}`);
  }
  if (job.yearsOfExperience) {
    parts.push(`Experience: ${job.yearsOfExperience}`);
  }
  if (job.hiringProcess?.length) {
    parts.push(`Hiring process: ${job.hiringProcess.join(' → ')}`);
  }

  return parts.join('\n\n');
}
