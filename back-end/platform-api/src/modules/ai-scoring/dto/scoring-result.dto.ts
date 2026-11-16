import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * How the AI service produced the result.
 *
 * - `scored` - a language model was available and wrote the assessment.
 * - `score_only` - only the deterministic score was computed; the narrative
 *   is empty.
 */
export enum ScoringMode {
  SCORED = 'scored',
  SCORE_ONLY = 'score_only',
}

/** The envelope every event carries. */
export class ScoringEventEnvelopeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId!: string;

  @ApiProperty({ example: 'scoring.completed' })
  @IsString()
  eventType!: string;

  @ApiProperty({ description: 'ISO timestamp of when the event happened' })
  @IsString()
  occurredAt!: string;
}

/**
 * `scoring.completed`: the AI service finished scoring an application.
 *
 * The field names are the contract with the Python service
 * (`back-end/ai-platform/app/schemas/messaging.py`). Change one side and
 * change the other in the same commit.
 */
export class ScoringCompletedMessageDto extends ScoringEventEnvelopeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  candidateId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jobId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  matchId!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  weightsVersion?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  @IsObject()
  @IsOptional()
  componentScores?: Record<string, number>;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  matchingSkills?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  missingSkills?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  aiSummary?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  strengths?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  risks?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interviewQuestions?: string[];

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  knockoutReason?: string | null;

  /**
   * Which kind of result this is. Older AI services do not send it; the
   * consumer then works it out from the narrative.
   */
  @ApiPropertyOptional({ enum: ScoringMode })
  @IsEnum(ScoringMode)
  @IsOptional()
  mode?: ScoringMode;
}

/** `scoring.failed`: the AI service gave up scoring an application. */
export class ScoringFailedMessageDto extends ScoringEventEnvelopeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  candidateId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jobId!: string;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @IsOptional()
  attempt?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;
}
