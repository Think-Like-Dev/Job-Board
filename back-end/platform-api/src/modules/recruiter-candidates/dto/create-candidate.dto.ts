import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

function emptyToUndefined({ value }: TransformFnParams): unknown {
  return value === '' ? undefined : value;
}

/**
 * Multipart text fields arrive as JSON strings. JSON requests pass arrays
 * through unchanged. Invalid JSON is returned as-is so class-validator reports
 * the real type error instead of a generic parse failure.
 */
export function parseJsonField({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value;

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

export class CreateCandidateEducationDto {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  institution!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 150)
  degree!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 150)
  fieldOfStudy!: string;

  @ApiProperty({ example: '2020-08-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-05-01', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  grade?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 3.8 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  gpa?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalDetails?: string | null;
}

export class CreateCandidateExperienceDto {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  companyName!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 150)
  jobTitle!: string;

  @ApiProperty({ example: '2020-08-01' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ example: '2024-05-01', nullable: true })
  @IsOptional()
  @IsDateString()
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  salary?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;
}

export class CreateCandidateCertificationDto {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 200)
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuer?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  skillId?: string | null;

  @ApiProperty({
    description: 'Credential URL; soft-copy uploads are deferred',
  })
  @IsUrl()
  @MaxLength(2000)
  credentialUrl!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;
}

/** Recruiter manual candidate create. Resume/profile image travel as files. */
export class CreateCandidateDto {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 255)
  firstName!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @Length(1, 255)
  lastName!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentLocation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  state?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  country?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  linkedinUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUrl()
  @MaxLength(255)
  portfolioUrl?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Skill names. Unknown names are created in the canonical taxonomy.',
  })
  @Transform(parseJsonField)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  skills?: string[];

  @ApiPropertyOptional({ type: [CreateCandidateEducationDto] })
  @Transform(parseJsonField)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateEducationDto)
  education?: CreateCandidateEducationDto[];

  @ApiPropertyOptional({ type: [CreateCandidateExperienceDto] })
  @Transform(parseJsonField)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateExperienceDto)
  experience?: CreateCandidateExperienceDto[];

  @ApiPropertyOptional({ type: [CreateCandidateCertificationDto] })
  @Transform(parseJsonField)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateCandidateCertificationDto)
  certifications?: CreateCandidateCertificationDto[];
}
