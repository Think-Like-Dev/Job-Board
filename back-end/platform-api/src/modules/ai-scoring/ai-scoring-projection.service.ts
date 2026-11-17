import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { type EntityManager, EntityRepository } from '@mikro-orm/core';
import { EntityManager as PostgreSqlEntityManager } from '@mikro-orm/postgresql';
import { AiScoreStatus } from '@common/constants/enums';
import {
  ApplicationAiScore,
  ApplicationAiScoreSchema,
} from './application-ai-score.schema';
import { toApplicationAiScoreDto } from './dto/ai-score-response.dto';
import {
  ScoringCompletedMessageDto,
  ScoringFailedMessageDto,
  ScoringMode,
} from './dto/scoring-result.dto';
import { AiScoreEventsService } from './ai-score-events.service';

/**
 * The recruiter-facing view of the AI service's assessment.
 *
 * The AI service owns the real match. This service only stores what the
 * `scoring.completed` event carries and hands it to the recruiter API.
 *
 * Two rules keep the projection honest:
 *
 * 1. A result never overwrites a newer one. The events carry the moment they
 *    happened, and a result that is older than what is stored is dropped. The
 *    broker delivers at least once, so the same result can arrive twice; the
 *    second copy changes nothing.
 * 2. A failure never erases a score. If the AI gave up on a run, the row says
 *    so, but a score that already arrived stays.
 */
@Injectable()
export class AiScoringProjectionService {
  private readonly logger = new Logger(AiScoringProjectionService.name);

  constructor(
    @InjectRepository(ApplicationAiScoreSchema)
    private readonly repository: EntityRepository<ApplicationAiScore>,
    private readonly em: PostgreSqlEntityManager,
    private readonly events: AiScoreEventsService,
  ) {}

  /**
   * Marks an application as waiting for its score.
   *
   * Runs in the caller's transaction, next to the event that asks for the
   * score, so the recruiter sees "scoring" from the moment the application
   * is submitted. A score that is already there is cleared: it belongs to
   * the previous run and would be stale.
   */
  async markPending(
    em: EntityManager,
    application: { id: string; candidateId: string; jobId: string },
  ): Promise<void> {
    await em.getConnection().execute(
      `INSERT INTO "application_ai_scores"
            ("id", "application_id", "candidate_id", "job_id", "status",
             "score", "weights_version", "component_scores", "matching_skills",
             "missing_skills", "ai_summary", "strengths", "risks",
             "interview_questions", "knockout_reason", "failure_reason",
             "failure_message", "event_id", "scored_at", "created_at", "updated_at")
       VALUES (gen_random_uuid(), ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL,
               NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, now(), now())
       ON CONFLICT ("application_id") DO UPDATE SET
             "status" = EXCLUDED."status",
             "score" = NULL,
             "weights_version" = NULL,
             "component_scores" = NULL,
             "matching_skills" = NULL,
             "missing_skills" = NULL,
             "ai_summary" = NULL,
             "strengths" = NULL,
             "risks" = NULL,
             "interview_questions" = NULL,
             "knockout_reason" = NULL,
             "failure_reason" = NULL,
             "failure_message" = NULL,
             "event_id" = NULL,
             "scored_at" = NULL,
             "updated_at" = now()`,
      [
        application.id,
        application.candidateId,
        application.jobId,
        AiScoreStatus.PENDING,
      ],
    );
  }

  /** Writes a finished assessment. */
  async applyCompleted(message: ScoringCompletedMessageDto): Promise<void> {
    const status = this.resolveStatus(message);

    await this.em.getConnection().execute(
      `INSERT INTO "application_ai_scores"
            ("id", "application_id", "candidate_id", "job_id", "status",
             "score", "weights_version", "component_scores", "matching_skills",
             "missing_skills", "ai_summary", "strengths", "risks",
             "interview_questions", "knockout_reason", "failure_reason",
             "failure_message", "event_id", "scored_at", "created_at", "updated_at")
       VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, CAST(? AS jsonb),
               CAST(? AS jsonb), CAST(? AS jsonb), ?, CAST(? AS jsonb),
               CAST(? AS jsonb), CAST(? AS jsonb), ?, NULL, NULL, ?, ?, now(), now())
       ON CONFLICT ("application_id") DO UPDATE SET
             "status" = EXCLUDED."status",
             "score" = EXCLUDED."score",
             "weights_version" = EXCLUDED."weights_version",
             "component_scores" = EXCLUDED."component_scores",
             "matching_skills" = EXCLUDED."matching_skills",
             "missing_skills" = EXCLUDED."missing_skills",
             "ai_summary" = EXCLUDED."ai_summary",
             "strengths" = EXCLUDED."strengths",
             "risks" = EXCLUDED."risks",
             "interview_questions" = EXCLUDED."interview_questions",
             "knockout_reason" = EXCLUDED."knockout_reason",
             "failure_reason" = NULL,
             "failure_message" = NULL,
             "event_id" = EXCLUDED."event_id",
             "scored_at" = EXCLUDED."scored_at",
             "updated_at" = now()
       WHERE "application_ai_scores"."scored_at" IS NULL
          OR "application_ai_scores"."scored_at" <= EXCLUDED."scored_at"`,
      [
        message.applicationId,
        message.candidateId,
        message.jobId,
        status,
        message.score,
        message.weightsVersion ?? null,
        JSON.stringify(message.componentScores ?? {}),
        JSON.stringify(message.matchingSkills ?? []),
        JSON.stringify(message.missingSkills ?? []),
        message.aiSummary ?? null,
        JSON.stringify(message.strengths ?? []),
        JSON.stringify(message.risks ?? []),
        JSON.stringify(message.interviewQuestions ?? []),
        message.knockoutReason ?? null,
        message.eventId,
        this.toTimestamp(message.occurredAt),
      ],
    );

    await this.notifyStored(message.applicationId, message.eventId);
  }

  /** Records that the AI gave up. Never erases a score that already arrived. */
  async applyFailed(message: ScoringFailedMessageDto): Promise<void> {
    await this.em.getConnection().execute(
      `INSERT INTO "application_ai_scores"
            ("id", "application_id", "candidate_id", "job_id", "status",
             "score", "weights_version", "component_scores", "matching_skills",
             "missing_skills", "ai_summary", "strengths", "risks",
             "interview_questions", "knockout_reason", "failure_reason",
             "failure_message", "event_id", "scored_at", "created_at", "updated_at")
       VALUES (gen_random_uuid(), ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL,
               NULL, NULL, NULL, NULL, ?, ?, ?, ?, now(), now())
       ON CONFLICT ("application_id") DO UPDATE SET
             "status" = EXCLUDED."status",
             "failure_reason" = EXCLUDED."failure_reason",
             "failure_message" = EXCLUDED."failure_message",
             "event_id" = EXCLUDED."event_id",
             "scored_at" = EXCLUDED."scored_at",
             "updated_at" = now()
       WHERE "application_ai_scores"."status" IN (?, ?)
          AND ("application_ai_scores"."scored_at" IS NULL
               OR "application_ai_scores"."scored_at" <= EXCLUDED."scored_at")`,
      [
        message.applicationId,
        message.candidateId,
        message.jobId,
        AiScoreStatus.FAILED,
        message.reason ?? null,
        message.message ?? null,
        message.eventId,
        this.toTimestamp(message.occurredAt),
        AiScoreStatus.PENDING,
        AiScoreStatus.FAILED,
      ],
    );

    await this.notifyStored(message.applicationId, message.eventId);
  }

  /**
   * Removes the "waiting for the score" marker of an application.
   *
   * Used when the application is withdrawn: the score will never arrive, so
   * the recruiter should not be told it is on its way. A score that already
   * arrived stays - it is part of the history of the application.
   */
  async clearPending(em: EntityManager, applicationId: string): Promise<void> {
    await em.getConnection().execute(
      `DELETE FROM "application_ai_scores"
        WHERE "application_id" = ? AND "status" = ?`,
      [applicationId, AiScoreStatus.PENDING],
    );
  }

  /**
   * Tells the open drawers of an application what was just stored.
   *
   * The row is read back, so the notification carries exactly what the
   * recruiter API returns, and a result that lost the race against a newer
   * one is not announced: the stored row no longer points at its event.
   */
  private async notifyStored(
    applicationId: string,
    eventId: string,
  ): Promise<void> {
    try {
      // The consumer runs outside a request, so it has no EntityManager
      // context: `this.em` is the global one, and reading through it would
      // use a shared identity map (and reject the `refresh`). A fork has its
      // own context and reads the row the way the recruiter API will.
      const em = this.em.fork();
      const stored = await em.findOne(ApplicationAiScoreSchema, {
        applicationId,
      });

      if (!stored || stored.eventId !== eventId) {
        return;
      }

      const assessment = toApplicationAiScoreDto(stored);
      if (assessment) {
        this.events.publish(applicationId, assessment);
      }
    } catch (error) {
      // The row is written; a drawer that cannot be told is not a failure of
      // the scoring itself.
      this.logger.warn(
        `Could not notify the streams of application ${applicationId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /** The assessment of one application, if there is one. */
  async findByApplicationId(
    applicationId: string,
  ): Promise<ApplicationAiScore | null> {
    return this.repository.findOne({ applicationId });
  }

  /** The assessments of many applications, keyed by application id. */
  async findByApplicationIds(
    applicationIds: string[],
  ): Promise<Map<string, ApplicationAiScore>> {
    if (!applicationIds.length) {
      return new Map();
    }

    const rows = await this.repository.find({
      applicationId: { $in: applicationIds },
    });

    return new Map(rows.map((row) => [row.applicationId, row]));
  }

  /**
   * Whether the result carries a narrative or only the number.
   *
   * The AI service says so in `mode`. An older service does not send the
   * field, and then the answer comes from the narrative itself: no summary,
   * no strengths, no risks and no questions means the score is all there is.
   */
  private resolveStatus(message: ScoringCompletedMessageDto): AiScoreStatus {
    if (message.mode === ScoringMode.SCORE_ONLY) {
      return AiScoreStatus.SCORE_ONLY;
    }
    if (message.mode === ScoringMode.SCORED) {
      return AiScoreStatus.SCORED;
    }

    const hasNarrative =
      Boolean(message.aiSummary?.trim()) ||
      Boolean(message.strengths?.length) ||
      Boolean(message.risks?.length) ||
      Boolean(message.interviewQuestions?.length);

    return hasNarrative ? AiScoreStatus.SCORED : AiScoreStatus.SCORE_ONLY;
  }

  private toTimestamp(value: string): Date | null {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
