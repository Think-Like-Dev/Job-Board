import { EntitySchema } from '@mikro-orm/core';
import { AiScoreFailureCode, AiScoreStatus } from '@common/constants/enums';

/**
 * The AI's assessment of one application, as the core API sees it.
 *
 * The AI service owns the real match (its own database, its own vectors).
 * This table is the projection the recruiter UI reads: the score, the
 * narrative and the skills that matched or did not. Nothing here is
 * computed in the core API - the row is written from the `scoring.completed`
 * event the AI service publishes.
 *
 * There is exactly one row per application. The row is created as `PENDING`
 * when the scoring request is queued, so the recruiter sees that something is
 * happening, and it is filled in when the result arrives.
 */
export interface ApplicationAiScore {
  id: string;
  /** The application this assessment belongs to. */
  applicationId: string;
  candidateId: string;
  jobId: string;
  status: AiScoreStatus;
  /** The score, 0 to 100. PostgreSQL decimal hydrates as a string. */
  score?: string | null;
  /** Which set of weights produced the score, so old scores stay readable. */
  weightsVersion?: string | null;
  /** The score broken down per component (role, skills, semantic, ...). */
  componentScores?: Record<string, number> | null;
  matchingSkills?: string[] | null;
  missingSkills?: string[] | null;
  /** The narrative the language model wrote about the fit. */
  aiSummary?: string | null;
  strengths?: string[] | null;
  risks?: string[] | null;
  interviewQuestions?: string[] | null;
  /** Set when a knockout rule decided the outcome (missing must-have skill). */
  knockoutReason?: string | null;
  /** Why the AI gave up, when it did. */
  failureReason?: string | null;
  /** Machine-readable reason: a review the recruiter can act on, or a failure. */
  failureCode?: AiScoreFailureCode | null;
  failureMessage?: string | null;
  /** The event this row was written from, so a replay can be recognised. */
  eventId?: string | null;
  /** When the AI produced the result. */
  scoredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const ApplicationAiScoreSchema = new EntitySchema<ApplicationAiScore>({
  name: 'ApplicationAiScore',
  tableName: 'application_ai_scores',
  // One assessment per application: the upsert that writes the result
  // depends on this.
  uniques: [
    {
      name: 'application_ai_scores_application_id_unique',
      properties: ['applicationId'],
    },
  ],
  indexes: [
    {
      name: 'application_ai_scores_candidate_id_index',
      properties: ['candidateId'],
    },
    {
      name: 'application_ai_scores_job_id_index',
      properties: ['jobId'],
    },
  ],
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    applicationId: { type: 'uuid' },
    candidateId: { type: 'uuid' },
    jobId: { type: 'uuid' },
    status: {
      enum: true,
      items: () => AiScoreStatus,
      nativeEnumName: 'ai_score_status',
      default: AiScoreStatus.PENDING,
    },
    score: { type: 'decimal', precision: 5, scale: 2, nullable: true },
    weightsVersion: { type: 'string', nullable: true },
    componentScores: { type: 'json', columnType: 'jsonb', nullable: true },
    matchingSkills: { type: 'json', columnType: 'jsonb', nullable: true },
    missingSkills: { type: 'json', columnType: 'jsonb', nullable: true },
    aiSummary: { type: 'text', nullable: true },
    strengths: { type: 'json', columnType: 'jsonb', nullable: true },
    risks: { type: 'json', columnType: 'jsonb', nullable: true },
    interviewQuestions: { type: 'json', columnType: 'jsonb', nullable: true },
    knockoutReason: { type: 'text', nullable: true },
    failureReason: { type: 'string', nullable: true },
    failureCode: {
      type: 'string',
      columnType: 'text',
      nullable: true,
    },
    failureMessage: { type: 'text', nullable: true },
    eventId: { type: 'uuid', nullable: true },
    scoredAt: { type: 'datetime', nullable: true },
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
    updatedAt: {
      type: 'datetime',
      defaultRaw: 'now()',
      onUpdate: () => new Date(),
    },
  },
});
