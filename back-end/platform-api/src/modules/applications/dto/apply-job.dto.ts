import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/**
 * Multipart form fields sent alongside the optional resume/cover-letter parts.
 * Multipart values arrive as strings, so booleans are normalized first.
 */
function toBoolean({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  // Return the original value so @IsBoolean rejects it with a 400.
  return value;
}

export class ApplyJobDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Save as a draft instead of submitting to the recruiter',
  })
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'When submitting, replace the candidate profile resume with the uploaded resume',
  })
  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  updateProfileResume?: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Existing resume file owned by the candidate (alternative to uploading)',
  })
  @IsUUID()
  @IsOptional()
  existingResumeFileId?: string;
}
