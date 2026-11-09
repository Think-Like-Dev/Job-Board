import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CandidateProfileDto } from '@modules/profiles/dto/profile-response.dto';

export class CandidateSkillDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

/** Row shape for the recruiter candidate directory. */
export class CandidateListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  firstName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName?: string | null;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentLocation?: string | null;

  @ApiProperty({ type: [CandidateSkillDto] })
  skills!: CandidateSkillDto[];

  @ApiProperty({ description: 'Merged experience in whole months' })
  totalExperienceMonths!: number;

  @ApiProperty({ description: 'Non-draft applications across all jobs' })
  totalApplicationsCount!: number;

  @ApiPropertyOptional({ nullable: true })
  createdAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  resumeFileId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  profileImageFileId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Internal user who pre-created the profile, if any',
  })
  createdBy?: string | null;
}

export class CandidatePaginationDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CandidateListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: [CandidateListItemDto] })
  data!: CandidateListItemDto[];

  @ApiProperty({ type: CandidatePaginationDto })
  pagination!: CandidatePaginationDto;
}

export class CandidateCareerGapDto {
  @ApiProperty({ example: '2022-04-01' })
  startDate!: string;

  @ApiProperty({ example: '2022-08-31' })
  endDate!: string;

  @ApiProperty({ description: 'Gap length in whole months' })
  months!: number;
}

/** Live profile plus the candidate-level fields used by the detail page. */
export class CandidateDetailDto extends CandidateProfileDto {
  @ApiPropertyOptional({ nullable: true })
  createdAt?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdBy?: string | null;

  @ApiProperty({ description: 'Merged experience in whole months' })
  totalExperienceMonths!: number;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Earliest completed education end date, or first job start',
  })
  careerStartDate?: string | null;

  @ApiProperty({ type: [CandidateCareerGapDto] })
  gaps!: CandidateCareerGapDto[];
}

export class CandidateDetailResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CandidateDetailDto })
  data!: CandidateDetailDto;
}
