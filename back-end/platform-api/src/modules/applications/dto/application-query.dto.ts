import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { ApplicationStatus } from '@common/constants/enums';

/** Candidate's own applications: drafts included, newest first. */
export class CandidateApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Only return the candidate application for this job (used by the apply drawer)',
  })
  @IsUUID()
  @IsOptional()
  jobId?: string;
}

/**
 * Recruiter view of a job's candidates. Drafts are never returned; `search`
 * matches candidate first name, last name, or email.
 */
export class JobApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  @IsOptional()
  status?: ApplicationStatus;
}
