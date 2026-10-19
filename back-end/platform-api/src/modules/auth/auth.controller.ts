import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthRole, UserRole } from '@common/constants/enums';
import type { Candidate } from '@modules/candidates/candidate.schema';
import type { User } from '@modules/users/user.schema';
import { AuthService } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { CandidatesService } from '@modules/candidates/candidates.service';
import {
  AuthResponseDto,
  AuthUserDto,
  LoginDto,
  LoginResponseDto,
  OtpRequestResponseDto,
  RequestOtpDto,
  VerifyOtpDto,
} from './auth.dto';
import type { AppConfig } from '@src/config/configuration';
import { SessionAuthGuard } from './session-auth.guard';
import type { AuthenticatedRequest } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly candidatesService: CandidatesService,
  ) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request an OTP for candidate email login/signup' })
  @ApiOkResponse({ type: OtpRequestResponseDto })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<OtpRequestResponseDto> {
    const otp = await this.authService.generateOtp(
      dto.email,
      AuthRole.CANDIDATE,
    );
    return { message: 'OTP sent to your email', ...this.devOtp(otp) };
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify an OTP and start a session (candidate or recruiter)',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const role = await this.authService.verifyOtp(dto.email, dto.otp);
    if (!role) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (role === AuthRole.CANDIDATE) {
      const candidate = await this.candidatesService.findOrCreateByEmail(
        dto.email,
      );
      await this.authService.createSession(res, {
        principalType: 'candidate',
        principalId: candidate.id,
        email: candidate.email,
        role: AuthRole.CANDIDATE,
      });
      return { user: toCandidateDto(candidate) };
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.authService.createSession(res, {
      principalType: 'user',
      principalId: user.id,
      email: user.email,
      role: user.role ?? UserRole.RECRUITER,
    });
    return { user: toUserDto(user) };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recruiter login step 1: email + password, then an OTP is sent',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      !(await this.usersService.verifyPassword(user, dto.password))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isActive === false) {
      throw new UnauthorizedException('Account is disabled');
    }

    const otp = await this.authService.generateOtp(
      user.email,
      AuthRole.RECRUITER,
    );
    return {
      success: true,
      otpRequired: true,
      message: 'OTP sent to your email',
      ...this.devOtp(otp),
    };
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth('session_token')
  @ApiOperation({ summary: 'Get the currently authenticated principal' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired session' })
  async me(@Req() req: AuthenticatedRequest): Promise<AuthResponseDto> {
    if (req.session.principalType === 'candidate') {
      const candidate = await this.candidatesService.findByEmail(
        req.session.email,
      );
      if (!candidate) {
        throw new UnauthorizedException('Session principal no longer exists');
      }
      return { user: toCandidateDto(candidate) };
    }

    const user = await this.usersService.findByEmail(req.session.email);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Session principal no longer exists');
    }
    return { user: toUserDto(user) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout, destroy the Redis session and clear the cookie',
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const cookie = this.config.get('cookie', { infer: true });
    const cookies = req.cookies as Record<string, string> | undefined;
    await this.authService.destroySession(res, cookies?.[cookie.name]);
    return { success: true };
  }

  /** Exposes the OTP in local development only, where no mailer is configured. */
  private devOtp(otp: string): { otp?: string } {
    return this.config.get('nodeEnv', { infer: true }) === 'local'
      ? { otp }
      : {};
  }
}

function toCandidateDto(candidate: Candidate): AuthUserDto {
  return {
    id: candidate.id,
    email: candidate.email,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    role: AuthRole.CANDIDATE,
    principalType: 'candidate',
  };
}

function toUserDto(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? UserRole.RECRUITER,
    principalType: 'user',
  };
}
