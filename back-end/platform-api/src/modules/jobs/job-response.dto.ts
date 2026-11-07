import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CompensationType,
  EmploymentType,
  JobStatus,
  WorkMode,
} from '@common/constants/enums';

export class JobCompensationResponseDto {
  @ApiProperty({ enum: CompensationType })
  type!: CompensationType;

  @ApiPropertyOptional({ example: '$ USD' })
  currency?: string;

  @ApiPropertyOptional({ enum: ['Yearly', 'Monthly', 'Hourly'] })
  period?: string;

  @ApiPropertyOptional({
    oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' } }],
  })
  amount?: number | number[];
}

export class ApplicationSettingsResponseDto {
  @ApiProperty()
  coverLetterRequired!: boolean;

  @ApiProperty()
  attachmentsAllowed!: boolean;

  @ApiProperty()
  maximumAttachments!: number;
}

/** Shape consumed by the recruiter frontend's job summary schema. */
export class JobSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'JOB-1A2B3C4D5E' })
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiPropertyOptional({
    type: JobCompensationResponseDto,
    nullable: true,
  })
  compensation?: JobCompensationResponseDto | null;

  @ApiProperty()
  location!: string;

  @ApiProperty({ type: [String] })
  keywords!: string[];

  @ApiProperty({ enum: EmploymentType })
  employmentType!: EmploymentType;

  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional()
  designation?: string;

  @ApiPropertyOptional({ type: [String] })
  benefits?: string[];

  @ApiPropertyOptional()
  totalInterviewRounds?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  lastApplicationDate?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'Set when the job is published' })
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'Set when the job is archived' })
  archivedAt?: string;

  @ApiPropertyOptional({ description: 'User id of the creating recruiter' })
  createdBy?: string;
}

/** Full job payload used by the edit page and the detail drawer. */
export class JobDetailDto extends JobSummaryDto {
  @ApiProperty()
  description!: string;

  @ApiProperty()
  responsibilities!: string;

  @ApiProperty()
  yearsOfExperience!: string;

  @ApiProperty()
  vacancies!: number;

  @ApiProperty({ enum: WorkMode, isArray: true })
  workMode!: WorkMode[];

  @ApiProperty({ type: [String] })
  workShiftTiming!: string[];

  @ApiProperty({ type: [String] })
  skills!: string[];

  @ApiPropertyOptional({ type: ApplicationSettingsResponseDto })
  applicationSettings?: ApplicationSettingsResponseDto;

  @ApiPropertyOptional({ type: [String] })
  hiringProcess?: string[];
}

export class JobResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job created successfully' })
  message!: string;

  @ApiProperty({ type: JobSummaryDto })
  data!: JobSummaryDto;
}

export class JobDetailResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job fetched successfully' })
  message!: string;

  @ApiProperty({ type: JobDetailDto })
  data!: JobDetailDto;
}

export class JobPaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class JobListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Jobs fetched successfully' })
  message!: string;

  @ApiProperty({ type: [JobSummaryDto] })
  data!: JobSummaryDto[];

  @ApiProperty({ type: JobPaginationDto })
  pagination!: JobPaginationDto;
}

export class JobStatusResultDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional()
  publishedAt?: string;

  @ApiPropertyOptional()
  archivedAt?: string;
}

export class JobStatusResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job status updated successfully' })
  message!: string;

  @ApiProperty({ type: JobStatusResultDto })
  data!: JobStatusResultDto;
}

export class JobArchivePreviewDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty({
    description: 'Applications with an accepted offer for this job',
  })
  confirmedOffersCount!: number;

  @ApiProperty({
    description:
      'When true the client must show the irreversible-archive warning and resend with acknowledgeNoConfirmedOffers',
  })
  requiresNoConfirmedOffersAcknowledgement!: boolean;
}

export class JobArchivePreviewResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Archive preview fetched successfully' })
  message!: string;

  @ApiProperty({ type: JobArchivePreviewDto })
  data!: JobArchivePreviewDto;
}

export class DeletedJobDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  deletedAt!: string;
}

export class DeleteJobResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job deleted successfully' })
  message!: string;

  @ApiProperty({ type: DeletedJobDto })
  data!: DeletedJobDto;
}
