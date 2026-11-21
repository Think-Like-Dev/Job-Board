import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '@common/constants/enums';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

/**
 * Invites an internal user: the row is created as `INVITED` and the account
 * becomes usable only after onboarding sets a password.
 */
export class CreateUserDto {
  @ApiProperty({ example: 'jane@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: UserRole, default: UserRole.HIRING_MANAGER })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;
}

/**
 * Updates the profile of an internal user. Role and status changes are
 * admin-only and enforced by `UsersService`, not by the shape of this DTO.
 */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

/** Team listing filters. Recruiters are always scoped to hiring managers. */
export class UserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

/** What the onboarding screen is allowed to know before the password step. */
export class InvitationPreviewDto {
  @ApiProperty({ example: 'jane@company.com' })
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

/** Completes an invitation: password + the details the profile needs. */
export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '+1 555 0100' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: 'Talent Acquisition Lead' })
  @IsString()
  jobTitle!: string;
}

/**
 * Frontend-facing shape of an internal user.
 *
 * Deliberately explicit: the persisted entity carries credential material
 * (`passwordHash`) and must never be serialized straight to a response.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 'Jane Recruiter' })
  name?: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  jobTitle?: string;

  @ApiProperty({ example: 'jane@company.com' })
  email!: string;

  @ApiPropertyOptional({ enum: UserRole })
  role?: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  invitedAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  inviteExpiresAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  lastInviteSentAt?: string;

  @ApiProperty({ example: 1 })
  inviteSendCount!: number;

  @ApiPropertyOptional({ format: 'date-time' })
  onboardedAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  updatedAt?: string;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({
    example: {
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 20,
      totalPages: 1,
      currentPage: 1,
    },
  })
  meta!: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}
