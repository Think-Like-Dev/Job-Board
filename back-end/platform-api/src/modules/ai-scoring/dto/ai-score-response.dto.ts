import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiScoreFailureCode, AiScoreStatus } from '@common/constants/enums';
import type { ApplicationAiScore } from '../application-ai-score.schema';

/**
 * The short form of an assessment: enough to sort and to show in a column.
 */
export class ApplicationAiScoreSummaryDto {
  @ApiProperty({
    enum: AiScoreStatus,
    description:
      'PENDING: the score is on its way; SCORED: the assessment is complete; SCORE_ONLY: a number without a narrative; FAILED: the AI gave up',
  })
  status!: AiScoreStatus;

  @ApiPropertyOptional({ nullable: true, description: '0 to 100' })
  score?: number | null;

  @ApiProperty({
    description:
      'True when the document failed the quality gate and needs a human review instead of a retry',
  })
  needsReview!: boolean;
}

/**
 * The full assessment of an application, as the recruiter reads it.
 */
export class ApplicationAiScoreDto extends ApplicationAiScoreSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  weightsVersion?: string | null;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'number' },
    nullable: true,
    description: 'The score broken down per component',
  })
  componentScores?: Record<string, number> | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  matchingSkills?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  missingSkills?: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  aiSummary?: string | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  strengths?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  risks?: string[] | null;

  @ApiPropertyOptional({ type: [String], nullable: true })
  interviewQuestions?: string[] | null;

  @ApiPropertyOptional({ nullable: true })
  knockoutReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  failureReason?: string | null;

  @ApiPropertyOptional({ nullable: true })
  failureMessage?: string | null;

  @ApiPropertyOptional({ nullable: true })
  scoredAt?: string | null;
}

/**
 * Turns a stored row into the short form.
 *
 * The score is stored as a decimal, which PostgreSQL hands back as a string;
 * the API always speaks numbers.
 */
export function toApplicationAiScoreSummaryDto(
  score: ApplicationAiScore | null | undefined,
): ApplicationAiScoreSummaryDto | null {
  if (!score) {
    return null;
  }

  return {
    status: score.status,
    score: toNumber(score.score),
    needsReview: score.failureCode === AiScoreFailureCode.NEEDS_REVIEW,
  };
}

/** Turns a stored row into the full assessment. */
export function toApplicationAiScoreDto(
  score: ApplicationAiScore | null | undefined,
): ApplicationAiScoreDto | null {
  if (!score) {
    return null;
  }

  return {
    ...toApplicationAiScoreSummaryDto(score)!,
    weightsVersion: score.weightsVersion ?? null,
    componentScores: score.componentScores ?? null,
    matchingSkills: score.matchingSkills ?? null,
    missingSkills: score.missingSkills ?? null,
    aiSummary: score.aiSummary ?? null,
    strengths: score.strengths ?? null,
    risks: score.risks ?? null,
    interviewQuestions: score.interviewQuestions ?? null,
    knockoutReason: score.knockoutReason ?? null,
    failureReason: score.failureReason ?? null,
    failureMessage: score.failureMessage ?? null,
    scoredAt: score.scoredAt?.toISOString() ?? null,
  };
}

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
