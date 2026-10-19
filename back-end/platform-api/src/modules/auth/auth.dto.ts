import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

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
