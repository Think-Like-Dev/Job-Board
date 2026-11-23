import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

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
