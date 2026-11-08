import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileFileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional()
  filename?: string | null;

  @ApiPropertyOptional()
  mimeType?: string | null;

  @ApiPropertyOptional({ description: 'Size in bytes' })
  size?: number | null;

  @ApiProperty({ description: 'Guarded API-relative content URL' })
  url!: string;

  @ApiProperty({ description: 'Guarded API-relative download URL' })
  downloadUrl!: string;
}

export class ProfileEducationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  institution!: string;

  @ApiProperty()
  degree!: string;

  @ApiProperty()
  fieldOfStudy!: string;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional({ nullable: true })
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  grade?: string | null;

  @ApiPropertyOptional({ nullable: true })
  gpa?: string | null;

  @ApiPropertyOptional({ nullable: true })
  additionalDetails?: string | null;
}

export class ProfileExperienceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty()
  jobTitle!: string;

  @ApiProperty()
  startDate!: string;

  @ApiPropertyOptional({ nullable: true })
  endDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  salary?: string | null;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;
}

export class ProfileSkillDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;
}

export class ProfileCertificationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  issuer?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  skillId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  skillName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  credentialUrl?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  fileId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  fileName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  fileUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  issueDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  expiryDate?: string | null;
}

export class CandidateProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  firstName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  currentLocation?: string | null;

  @ApiPropertyOptional({ nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  state?: string | null;

  @ApiPropertyOptional({ nullable: true })
  country?: string | null;

  @ApiPropertyOptional({ nullable: true })
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  linkedinUrl?: string | null;

  @ApiPropertyOptional({ nullable: true })
  portfolioUrl?: string | null;

  @ApiPropertyOptional({ type: ProfileFileDto, nullable: true })
  profileImage?: ProfileFileDto | null;

  @ApiPropertyOptional({ type: ProfileFileDto, nullable: true })
  resume?: ProfileFileDto | null;

  @ApiPropertyOptional({ type: ProfileFileDto, nullable: true })
  coverLetter?: ProfileFileDto | null;

  @ApiProperty({ type: [ProfileEducationDto] })
  education!: ProfileEducationDto[];

  @ApiProperty({ type: [ProfileExperienceDto] })
  experience!: ProfileExperienceDto[];

  @ApiProperty({ type: [ProfileSkillDto] })
  skills!: ProfileSkillDto[];

  @ApiProperty({ type: [ProfileCertificationDto] })
  certifications!: ProfileCertificationDto[];

  @ApiPropertyOptional({ description: 'Present for immutable snapshots' })
  versionNumber?: number;

  @ApiPropertyOptional({ description: 'Present for immutable snapshots' })
  capturedAt?: string;
}

export class CandidateProfileResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty({ type: CandidateProfileDto })
  data!: CandidateProfileDto;
}
