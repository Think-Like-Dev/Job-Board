import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CompensationType,
  EmploymentType,
  JobStatus,
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
}

export class CreateJobResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Job created successfully' })
  message!: string;

  @ApiProperty({ type: JobSummaryDto })
  data!: JobSummaryDto;
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
