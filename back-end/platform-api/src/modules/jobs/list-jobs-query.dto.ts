import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { JobStatus } from '@common/constants/enums';

export const JOB_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'title',
  'status',
  'code',
  'location',
  'category',
  'compensation',
  'publishedAt',
] as const;

export const JOB_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;

export const JOB_COMPENSATION_FILTERS = ['NEGOTIABLE', 'NONE'] as const;

export type JobSortField = (typeof JOB_SORT_FIELDS)[number];
export type JobSortDirection = (typeof JOB_SORT_DIRECTIONS)[number];
export type JobCompensationFilter = (typeof JOB_COMPENSATION_FILTERS)[number];

/**
 * Query accepted by `GET /jobs`; mirrors the recruiter list page filters.
 * The global ValidationPipe forbids unknown properties, so every param the
 * frontend sends must be declared here.
 */
export class ListJobsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;

  @ApiPropertyOptional({ enum: JOB_SORT_FIELDS, default: 'createdAt' })
  @IsIn([...JOB_SORT_FIELDS])
  @IsOptional()
  orderBy: JobSortField = 'createdAt';

  @ApiPropertyOptional({ enum: JOB_SORT_DIRECTIONS, default: 'DESC' })
  @IsIn([...JOB_SORT_DIRECTIONS])
  @IsOptional()
  orderByDirection: JobSortDirection = 'DESC';

  @ApiPropertyOptional({ enum: JobStatus })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiPropertyOptional({
    enum: JOB_COMPENSATION_FILTERS,
    description:
      'Filter jobs without a numeric salary; NONE matches jobs with no compensation',
  })
  @IsIn([...JOB_COMPENSATION_FILTERS])
  @IsOptional()
  compensationType?: JobCompensationFilter;

  @ApiPropertyOptional({
    description:
      'Lower bound of the salary-range filter. Matches jobs whose pay overlaps the range.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  compensationMin?: number;

  @ApiPropertyOptional({
    description:
      'Upper bound of the salary-range filter. Matches jobs whose pay overlaps the range.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  compensationMax?: number;

  @ApiPropertyOptional({
    description: 'Free-text match on title, code, category or location',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by job category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by job location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    description: 'Filter by the free-text years-of-experience field',
  })
  @IsString()
  @IsOptional()
  yearsOfExperience?: string;

  @ApiPropertyOptional({
    description: 'Filter by the stored compensation currency',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Filter by the creating internal user' })
  @IsString()
  @IsOptional()
  recruiterId?: string;
}
