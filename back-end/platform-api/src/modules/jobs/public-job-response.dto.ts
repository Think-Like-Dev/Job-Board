import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, JobStatus, WorkMode } from '@common/constants/enums';
import {
  ApplicationSettingsResponseDto,
  JobCompensationResponseDto,
  JobPaginationDto,
} from './job-response.dto';

/**
 * Candidate-safe job summary. Excludes internal fields such as `createdBy`
 * and `archivedAt`, and includes the description snippet used by job cards.
 */
export class PublicJobSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'JOB-1A2B3C4D5E' })
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  location!: string;

  @ApiProperty({ enum: EmploymentType })
  employmentType!: EmploymentType;

  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional()
  designation?: string;

  @ApiPropertyOptional({
    type: JobCompensationResponseDto,
    nullable: true,
  })
  compensation?: JobCompensationResponseDto | null;

  @ApiProperty({ type: [String] })
  keywords!: string[];

  @ApiPropertyOptional({ type: [String] })
  benefits?: string[];

  @ApiPropertyOptional()
  totalInterviewRounds?: number;

  @ApiPropertyOptional({ example: '3-5 years' })
  yearsOfExperience?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  lastApplicationDate?: string;

  @ApiProperty({ enum: JobStatus })
  status!: JobStatus;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  updatedAt?: string;

  @ApiPropertyOptional({ description: 'Set when the job is published' })
  publishedAt?: string;
}

/** Full candidate-facing job detail. */
export class PublicJobDetailDto extends PublicJobSummaryDto {
  @ApiProperty()
  responsibilities!: string;

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

export class PublicJobListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Jobs fetched successfully' })
  message!: string;

  @ApiProperty({ type: [PublicJobSummaryDto] })
  data!: PublicJobSummaryDto[];

  @ApiProperty({ type: JobPaginationDto })
  pagination!: JobPaginationDto;
}

export class PublicJobDetailResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job fetched successfully' })
  message!: string;

  @ApiProperty({ type: PublicJobDetailDto })
  data!: PublicJobDetailDto;
}
