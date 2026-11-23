import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/** The applications whose AI review the recruiter wants to run again. */
export class RetryAiReviewDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description:
      'Applications of this job to review again. Any status is accepted except drafts and withdrawn applications.',
    example: ['2f1c1f7a-4f4b-4a2f-9d6a-3d1b2c3e4f50'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  applicationIds!: string[];
}

export class AiReviewOutcomeDto {
  @ApiProperty({
    example: 3,
    description: 'Applications queued for a fresh AI review',
  })
  queued!: number;

  @ApiPropertyOptional({
    example: 0,
    description:
      'Selected applications left alone (draft, withdrawn, or no resume on file)',
  })
  skipped?: number;
}

export class RetryAiReviewResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'AI review queued' })
  message!: string;

  @ApiProperty({ type: AiReviewOutcomeDto })
  data!: AiReviewOutcomeDto;
}
