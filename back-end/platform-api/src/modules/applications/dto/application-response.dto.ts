import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '@common/constants/enums';
import { CandidateProfileDto } from '@modules/profiles/dto/profile-response.dto';

export class ApplicationStatusHistoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ enum: ApplicationStatus, nullable: true })
  oldStatus?: ApplicationStatus | null;

  @ApiProperty({ enum: ApplicationStatus })
  newStatus!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  reason?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Candidate or internal user who made the change',
  })
  changedBy?: string | null;

  @ApiProperty()
  createdAt!: string;
}

/** Candidate-facing application card. */
export class CandidateApplicationSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  jobId!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty()
  jobCategory!: string;

  @ApiProperty()
  jobLocation!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  appliedAt?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true })
  withdrawnAt?: string | null;

  @ApiProperty({ format: 'uuid' })
  resumeFileId!: string;

  @ApiProperty()
  resumeFileName!: string;

  @ApiProperty({ description: 'Session-guarded streaming URL' })
  resumeFileUrl!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  coverLetterFileId?: string;

  @ApiPropertyOptional()
  coverLetterFileName?: string;

  @ApiPropertyOptional({ description: 'Session-guarded streaming URL' })
  coverLetterFileUrl?: string;
}

export class CandidateApplicationDetailDto extends CandidateApplicationSummaryDto {
  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiProperty({ type: [ApplicationStatusHistoryDto] })
  statusHistory!: ApplicationStatusHistoryDto[];
}

/** Candidate profile fields currently available to recruiters. */
export class RecruiterCandidateProfileDto {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  portfolioUrl?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  profileImageFileId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  resumeFileId?: string;
}

export class RecruiterApplicationListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  candidateId!: string;

  @ApiProperty()
  candidateName!: string;

  @ApiProperty()
  candidateEmail!: string;

  @ApiPropertyOptional()
  candidatePhone?: string;

  @ApiProperty({ format: 'uuid' })
  resumeFileId!: string;

  @ApiProperty()
  resumeFileName!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  appliedAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class RecruiterApplicationDetailDto extends RecruiterApplicationListItemDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Immutable profile snapshot; absent when the application shows live profile data',
  })
  profileVersionId?: string;

  @ApiProperty({
    type: CandidateProfileDto,
    description:
      'Profile as submitted: immutable snapshot when profileVersionId is set, otherwise the live profile',
  })
  profile!: CandidateProfileDto;

  @ApiProperty({ description: 'Session-guarded streaming URL' })
  resumeFileUrl!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  coverLetterFileId?: string;

  @ApiPropertyOptional()
  coverLetterFileName?: string;

  @ApiPropertyOptional({ description: 'Session-guarded streaming URL' })
  coverLetterFileUrl?: string;

  @ApiPropertyOptional({ nullable: true })
  withdrawnAt?: string | null;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiProperty({ type: RecruiterCandidateProfileDto })
  candidate!: RecruiterCandidateProfileDto;

  @ApiProperty({ type: [ApplicationStatusHistoryDto] })
  statusHistory!: ApplicationStatusHistoryDto[];
}

export class ApplicationPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CandidateApplicationListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [CandidateApplicationSummaryDto] })
  data!: CandidateApplicationSummaryDto[];

  @ApiProperty({ type: ApplicationPaginationDto })
  pagination!: ApplicationPaginationDto;
}

export class CandidateApplicationDetailResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CandidateApplicationDetailDto })
  data!: CandidateApplicationDetailDto;
}

export class RecruiterApplicationListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [RecruiterApplicationListItemDto] })
  data!: RecruiterApplicationListItemDto[];

  @ApiProperty({ type: ApplicationPaginationDto })
  pagination!: ApplicationPaginationDto;
}

/** One job an internal user is reviewing for a specific candidate. */
export class CandidateJobApplicationListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  jobId!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty()
  jobCode!: string;

  @ApiProperty()
  jobCategory!: string;

  @ApiPropertyOptional({ nullable: true })
  jobDepartment?: string | null;

  @ApiProperty()
  jobLocation!: string;

  @ApiProperty({ enum: ApplicationStatus })
  status!: ApplicationStatus;

  @ApiPropertyOptional({ nullable: true })
  appliedAt?: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class CandidateJobApplicationListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [CandidateJobApplicationListItemDto] })
  data!: CandidateJobApplicationListItemDto[];

  @ApiProperty({ type: ApplicationPaginationDto })
  pagination!: ApplicationPaginationDto;
}

export class RecruiterApplicationDetailResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: RecruiterApplicationDetailDto })
  data!: RecruiterApplicationDetailDto;
}

export class DeletedApplicationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
}

export class DeleteApplicationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: DeletedApplicationDto })
  data!: DeletedApplicationDto;
}
