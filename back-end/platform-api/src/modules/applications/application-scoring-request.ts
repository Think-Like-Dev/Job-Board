import type { File } from '@modules/files/file.schema';
import type { Job } from '@modules/jobs/job.schema';
import {
  type ApplicationScoringEvent,
  buildJobDescriptionText,
} from '@modules/messaging/application-scoring-event';
import { DEFAULT_OUTPUT_LANGUAGE } from '@modules/messaging/messaging.constants';
import type { ProfileView } from '@modules/profiles/profile.types';
import type { Application } from './application.schema';

/**
 * The event that asks the AI service to score one application.
 *
 * A submission and a re-review ask for exactly the same thing, so they build
 * the payload the same way: the job as text, the profile the recruiter sees
 * and a pointer to the resume in object storage. The bytes are never copied
 * into the message.
 */
export function buildApplicationScoringEvent(
  application: Application,
  job: Job,
  resume: File,
  storagePath: string,
  profile: ProfileView,
): ApplicationScoringEvent {
  return {
    applicationId: application.id,
    candidateId: application.candidateId,
    jobId: application.jobId,
    jobCode: job.code,
    jobTitle: job.title,
    jobDescriptionText: buildJobDescriptionText(job),
    jobSkills: job.skills ?? [],
    jobYearsOfExperience: job.yearsOfExperience ?? null,
    outputLanguage: DEFAULT_OUTPUT_LANGUAGE,
    profileSnapshot: profile,
    resume: {
      fileId: resume.id,
      storageKey: storagePath,
      filename: resume.filename ?? null,
      mimeType: resume.mimeType ?? null,
    },
  };
}
