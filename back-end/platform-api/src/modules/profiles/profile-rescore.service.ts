import { Injectable } from '@nestjs/common';
import { type EntityManager } from '@mikro-orm/core';
import { EntityManager as PostgreSqlEntityManager } from '@mikro-orm/postgresql';
import { ApplicationStatus, JobStatus } from '@common/constants/enums';
import {
  Application,
  ApplicationSchema,
} from '@modules/applications/application.schema';
import { File, FileSchema } from '@modules/files/file.schema';
import { Job, JobSchema } from '@modules/jobs/job.schema';
import {
  buildJobDescriptionText,
  type ApplicationScoringEvent,
} from '@modules/messaging/application-scoring-event';
import { ROUTING_APPLICATION_SUBMITTED } from '@modules/messaging/messaging.constants';
import { OutboxService } from '@modules/messaging/outbox.service';
import { ProfileSnapshotService } from './profile-snapshot.service';
import type { ProfileView } from './profile.types';

/**
 * Re-scores the open applications of a candidate whose central resume changed.
 *
 * "Open" means: the application is still `APPLIED` or `IN_REVIEW` (the
 * recruiter has not acted on it) and its job is still `PUBLISHED` or
 * `ARCHIVED` (an archived job still has open applications; only a `CLOSED`
 * job ends the line).
 *
 * **Every open application is re-scored**, not only the ones that used the
 * central resume: the candidate refreshed their CV, so the profile data the
 * recruiter sees (and the score derived from it) is stale either way.
 *
 * The document each application is scored against follows the candidate only
 * when it was the central resume that changed:
 *
 * - the application used the old central resume → it now points at the new
 *   central resume, because the candidate replaced that exact document;
 * - the application used its own job-specific upload → it keeps that
 *   document (that is what the candidate submitted for this job) and is
 *   re-scored against the updated profile.
 *
 * Applications that are no longer open keep the profile and the resume they
 * had when they were submitted, and are never re-scored.
 *
 * Each affected application is repointed at a **new** snapshot built from the
 * post-update profile, so the recruiter sees a consistent picture.
 */
@Injectable()
export class ProfileRescoreService {
  constructor(
    private readonly em: PostgreSqlEntityManager,
    private readonly outbox: OutboxService,
    private readonly snapshots: ProfileSnapshotService,
  ) {}

  /**
   * Repoints the affected applications and queues a scoring event for each.
   * Runs inside the caller's transaction so the repointing and the events
   * commit together.
   */
  async rescoreOpenApplications(
    em: EntityManager,
    candidateId: string,
    previousResumeFileId: string,
    newResumeFileId: string,
    profile: ProfileView,
    excludeApplicationId?: string,
  ): Promise<number> {
    const applications = await this.findOpenApplications(em, candidateId);

    const targets = applications.filter(
      (application) => application.id !== excludeApplicationId,
    );

    if (!targets.length) {
      return 0;
    }

    const files = await this.loadFiles(em, [
      newResumeFileId,
      ...targets.map((application) => application.resumeFileId),
    ]);

    const newResume = files.get(newResumeFileId);
    if (!newResume?.storagePath) {
      // Without a stored object there is nothing for the AI service to read.
      return 0;
    }

    const jobs = await this.loadJobs(
      em,
      targets.map((application) => application.jobId),
    );

    // One snapshot for all of them: they all show the same post-update
    // profile, so they can share a single immutable version.
    const version = await this.snapshots.createVersion(
      em,
      candidateId,
      profile,
    );

    let queued = 0;
    for (const application of targets) {
      const job = jobs.get(application.jobId);
      if (!job) {
        continue;
      }

      const usedCentralResume =
        application.resumeFileId === previousResumeFileId;
      const resume = usedCentralResume
        ? newResume
        : files.get(application.resumeFileId);

      if (!resume?.storagePath) {
        // Nothing to score against; leave the application untouched.
        continue;
      }

      if (usedCentralResume) {
        application.resumeFileId = newResumeFileId;
      }
      application.profileVersionId = version.id;
      application.updatedAt = new Date();

      const payload: ApplicationScoringEvent = {
        applicationId: application.id,
        candidateId,
        jobId: job.id,
        jobCode: job.code,
        jobDescriptionText: buildJobDescriptionText(job),
        profileSnapshot: profile,
        resume: {
          fileId: resume.id,
          storageKey: resume.storagePath,
          filename: resume.filename ?? null,
          mimeType: resume.mimeType ?? null,
        },
      };

      this.outbox.enqueue(em, {
        aggregateType: 'application',
        aggregateId: application.id,
        eventType: 'application.submitted',
        routingKey: ROUTING_APPLICATION_SUBMITTED,
        payload: payload as unknown as Record<string, unknown>,
      });
      queued += 1;
    }

    await em.flush();
    return queued;
  }

  private async findOpenApplications(
    em: EntityManager,
    candidateId: string,
  ): Promise<Application[]> {
    const applications = await em.getRepository(ApplicationSchema).find({
      candidateId,
      status: { $in: [ApplicationStatus.APPLIED, ApplicationStatus.IN_REVIEW] },
    });

    const jobs = await this.loadJobs(
      em,
      applications.map((application) => application.jobId),
    );

    return applications.filter((application) => {
      const job = jobs.get(application.jobId);
      if (!job || job.deletedAt) {
        return false;
      }
      return (
        job.status === JobStatus.PUBLISHED || job.status === JobStatus.ARCHIVED
      );
    });
  }

  private async loadJobs(
    em: EntityManager,
    jobIds: string[],
  ): Promise<Map<string, Job>> {
    const unique = [...new Set(jobIds.filter(Boolean))];
    if (!unique.length) {
      return new Map<string, Job>();
    }
    const jobs = await em
      .getRepository(JobSchema)
      .find({ id: { $in: unique } });
    return new Map(jobs.map((job) => [job.id, job]));
  }

  private async loadFiles(
    em: EntityManager,
    fileIds: string[],
  ): Promise<Map<string, File>> {
    const unique = [...new Set(fileIds.filter(Boolean))];
    if (!unique.length) {
      return new Map<string, File>();
    }
    const files = await em
      .getRepository(FileSchema)
      .find({ id: { $in: unique } });
    return new Map(files.map((file) => [file.id, file]));
  }
}
