import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Requests an OTP to be sent to the email (candidate auth). */
export class RequestOtpDto {
  @ApiProperty({ example: 'candidate@mail.com' })
  @IsEmail()
  email!: string;
}

/** Verifies the OTP and returns a session cookie. */
export class VerifyOtpDto {
  @ApiProperty({ example: 'candidate@mail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp!: string;
}

/** Recruiter login step 1: email + password. */
export class LoginDto {
  @ApiProperty({ example: 'jane@company.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  password!: string;
}

/** Password reset step 1: ask for a reset link. */
export class RequestPasswordResetDto {
  @ApiProperty({ example: 'jane@company.com' })
  @IsEmail()
  email!: string;
}

/** Password reset step 2: exchange the emailed token for a new password. */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Token from the reset link.' })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class PasswordResetRequestResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    example: 'If the account exists, a reset link has been sent.',
  })
  message!: string;

  @ApiPropertyOptional({
    description: 'Only returned in local development, where Mailpit is used.',
  })
  resetUrl?: string;
}

export class PasswordResetConfirmResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

/** A live session, safe to display (never the token). */
export class SessionResponseDto {
  @ApiProperty({ description: 'Public session id used for revocation.' })
  id!: string;

  @ApiProperty({ enum: ['candidate', 'user'] })
  principalType!: 'candidate' | 'user';

  @ApiProperty({ format: 'uuid' })
  principalId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  role!: string;

  @ApiPropertyOptional()
  ip?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  lastSeenAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ description: 'True for the session making the request.' })
  current!: boolean;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  data!: SessionResponseDto[];
}

/** Admin session filters: a principal, an email, or everyone. */
export class AdminSessionsQueryDto {
  @ApiPropertyOptional({ enum: ['candidate', 'user'] })
  @IsOptional()
  @IsIn(['candidate', 'user'])
  principalType?: 'candidate' | 'user';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsString()
  principalId?: string;

  @ApiPropertyOptional({ example: 'jane@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

/** Principal returned after authentication (candidate or internal user). */
export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiProperty({ example: 'CANDIDATE' })
  role!: string;

  @ApiProperty({ enum: ['candidate', 'user'] })
  principalType!: 'candidate' | 'user';

  @ApiProperty({
    type: [String],
    example: ['job.read', 'candidate.read'],
    description:
      'Effective permissions for the session. The SPA gates routes and actions on these, never on the role string.',
  })
  permissions!: string[];
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class LoginResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  otpRequired!: boolean;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ description: 'Only returned in local development.' })
  otp?: string;
}

export class OtpRequestResponseDto {
  @ApiProperty()
  message!: string;

  @ApiPropertyOptional({ description: 'Only returned in local development.' })
  otp?: string;
}
