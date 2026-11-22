import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager as PostgreSqlEntityManager } from '@mikro-orm/postgresql';
import { ApplicationStatus } from '@common/constants/enums';
import { AiScoringProjectionService } from '@modules/ai-scoring/ai-scoring-projection.service';
import { FilesService } from '@modules/files/files.service';
import { JobSchema } from '@modules/jobs/job.schema';
import { ROUTING_APPLICATION_SUBMITTED } from '@modules/messaging/messaging.constants';
import { OutboxService } from '@modules/messaging/outbox.service';
import { ProfileReadService } from '@modules/profiles/profile-read.service';
import type { ProfileView } from '@modules/profiles/profile.types';
import { Application, ApplicationSchema } from './application.schema';
import { buildApplicationScoringEvent } from './application-scoring-request';

/** What a re-review request did. */
export interface AiReviewOutcome {
  /** How many applications were queued for scoring. */
  queued: number;
  /** How many were left alone, and why they could be counted. */
  skipped: number;
}

/**
 * Queues a fresh AI review for applications the recruiter selected.
 *
 * A review is the same work as a submission: the AI service downloads the
 * resume again, extracts it with the current extractor, scores it and
 * announces the result. That makes the action safe to repeat for any
 * application - a failure that was a network or provider problem, a document
 * that was read badly by an older extractor, or a recruiter who simply wants
 * a second opinion all go through the same path.
 *
 * The stored score is cleared and the row is marked `PENDING` in the same
 * transaction as the event, so the recruiter sees "scoring" and never a stale
 * number next to a result that is about to change.
 */
@Injectable()
export class ApplicationAiReviewService {
  private readonly logger = new Logger(ApplicationAiReviewService.name);

  constructor(
    private readonly em: PostgreSqlEntityManager,
    private readonly outbox: OutboxService,
    private readonly aiScoring: AiScoringProjectionService,
    private readonly files: FilesService,
    private readonly profiles: ProfileReadService,
  ) {}

  async queue(
    jobId: string,
    applicationIds: string[],
  ): Promise<AiReviewOutcome> {
    const job = await this.em.findOne(JobSchema, {
      id: jobId,
      deletedAt: null,
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const applications = await this.loadApplications(jobId, applicationIds);
    const requested = new Set(applicationIds).size;
    if (!applications.length) {
      return { queued: 0, skipped: requested };
    }

    // Resolve the slow parts (the file row and the profile) before opening the
    // write transaction, so the transaction only holds the enqueue and the
    // projection reset.
    const prepared: Array<{
      application: Application;
      resumeFileId: string;
      payload: ReturnType<typeof buildApplicationScoringEvent>;
    }> = [];

    for (const application of applications) {
      const file = await this.files.findOne({ id: application.resumeFileId });
      if (!file?.storagePath) {
        continue;
      }

      let profile: ProfileView;
      try {
        profile = await this.profiles.getApplicationProfile(application);
      } catch (error) {
        this.logger.warn(
          `Skipping the AI review of ${application.id}: its profile could not be read (${String(error)})`,
        );
        continue;
      }

      prepared.push({
        application,
        resumeFileId: application.resumeFileId,
        payload: buildApplicationScoringEvent(
          application,
          job,
          file,
          file.storagePath,
          profile,
        ),
      });
    }

    if (!prepared.length) {
      return { queued: 0, skipped: requested };
    }

    await this.em.transactional(async (txEm) => {
      for (const item of prepared) {
        this.outbox.enqueue(txEm, {
          aggregateType: 'application',
          aggregateId: item.application.id,
          eventType: 'application.submitted',
          routingKey: ROUTING_APPLICATION_SUBMITTED,
          payload: item.payload as unknown as Record<string, unknown>,
        });

        await this.aiScoring.markPending(txEm, {
          id: item.application.id,
          candidateId: item.application.candidateId,
          jobId: item.application.jobId,
        });
      }
    });

    return {
      queued: prepared.length,
      skipped: requested - prepared.length,
    };
  }

  /**
   * The selected applications of this job that a review can act on.
   *
   * Drafts never reached the AI, and a withdrawn application is cancelled on
   * the AI side, so both are left out; anything else - scored, failed or
   * waiting - can be reviewed again.
   */
  private async loadApplications(
    jobId: string,
    applicationIds: string[],
  ): Promise<Application[]> {
    if (!applicationIds.length) {
      return [];
    }

    return this.em.find(ApplicationSchema, {
      id: { $in: [...new Set(applicationIds)] },
      jobId,
      status: { $nin: [ApplicationStatus.DRAFT, ApplicationStatus.WITHDRAWN] },
    });
  }
}
