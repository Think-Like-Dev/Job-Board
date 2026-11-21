import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthRole, UserRole, UserStatus } from '@common/constants/enums';
import { appUrl } from '@common/utils/app-url';
import type { Candidate } from '@modules/candidates/candidate.schema';
import type { User } from '@modules/users/user.schema';
import { MailService } from '@modules/mail/mail.service';
import { AuthService, type SessionMetadata } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { CandidatesService } from '@modules/candidates/candidates.service';
import {
  AuthResponseDto,
  AuthUserDto,
  LoginDto,
  LoginResponseDto,
  OtpRequestResponseDto,
  PasswordResetConfirmResponseDto,
  PasswordResetRequestResponseDto,
  RequestOtpDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './auth.dto';
import {
  AcceptInvitationDto,
  InvitationPreviewDto,
} from '@modules/users/user.dto';
import type { AppConfig } from '@src/config/configuration';
import { SessionAuth } from './session-auth.decorator';
import { PermissionsService } from '@modules/rbac/permissions.service';
import type { AuthenticatedRequest } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly candidatesService: CandidatesService,
    private readonly permissionsService: PermissionsService,
    private readonly mailService: MailService,
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
    await this.deliverOtp(dto.email, otp);
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
    @Req() req: Request,
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
      await this.authService.createSession(
        res,
        {
          principalType: 'candidate',
          principalId: candidate.id,
          email: candidate.email,
          role: AuthRole.CANDIDATE,
        },
        this.sessionMeta(req),
      );
      return {
        user: toCandidateDto(
          candidate,
          this.permissionsService.forSession({
            principalType: 'candidate',
            role: AuthRole.CANDIDATE,
          }),
        ),
      };
    }

    const user = await this.usersService.findByEmail(dto.email);
    if (
      !user ||
      user.isActive === false ||
      user.status === UserStatus.SUSPENDED
    ) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    if (user.status === UserStatus.INVITED) {
      throw new UnauthorizedException('Finish your invitation first');
    }

    await this.authService.createSession(
      res,
      {
        principalType: 'user',
        principalId: user.id,
        email: user.email,
        role: user.role ?? UserRole.RECRUITER,
      },
      this.sessionMeta(req),
    );
    return {
      user: toUserDto(
        user,
        this.permissionsService.forRole(user.role ?? UserRole.RECRUITER),
      ),
    };
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
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Invited users have no password hash yet, so the status check has to run
    // before verifyPassword or they only ever see "Invalid credentials".
    if (user.status === UserStatus.INVITED) {
      throw new UnauthorizedException('Finish your invitation first');
    }
    if (!(await this.usersService.verifyPassword(user, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.isActive === false || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is disabled');
    }

    const otp = await this.authService.generateOtp(
      user.email,
      AuthRole.RECRUITER,
    );
    await this.deliverOtp(user.email, otp);
    return {
      success: true,
      otpRequired: true,
      message: 'OTP sent to your email',
      ...this.devOtp(otp),
    };
  }

  @Get('invitation/:token')
  @ApiOperation({ summary: 'Preview an invitation (public onboarding)' })
  @ApiOkResponse({ type: InvitationPreviewDto })
  async previewInvitation(
    @Param('token') token: string,
  ): Promise<InvitationPreviewDto> {
    return this.usersService.previewInvitation(token);
  }

  @Post('invitation/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an invitation and start a session' })
  @ApiOkResponse({ type: AuthResponseDto })
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.acceptInvitation(dto);
    const role = user.role ?? UserRole.HIRING_MANAGER;

    await this.authService.createSession(
      res,
      {
        principalType: 'user',
        principalId: user.id,
        email: user.email,
        role,
      },
      this.sessionMeta(req),
    );

    return {
      user: toUserDto(user, this.permissionsService.forRole(role)),
    };
  }

  @Post('password/reset/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a password reset link to an internal user' })
  @ApiOkResponse({ type: PasswordResetRequestResponseDto })
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<PasswordResetRequestResponseDto> {
    const genericMessage = 'If the account exists, a reset link has been sent.';
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);

    // Never reveal whether an address belongs to an account.
    if (!user || user.isActive === false) {
      return { success: true, message: genericMessage };
    }

    const token = await this.authService.createPasswordResetToken(email);
    const mail = this.config.get('mail', { infer: true });
    const resetUrl = appUrl(mail.appBaseUrl, `/reset-password?token=${token}`);

    try {
      await this.mailService.sendPasswordReset(email, resetUrl);
    } catch (error) {
      // Local development may run without Mailpit; the link is returned below.
      if (this.config.get('nodeEnv', { infer: true }) !== 'local') {
        throw error;
      }
      this.logger.warn(
        `Password reset mail failed in local mode: ${(error as Error).message}`,
      );
    }

    return {
      success: true,
      message: genericMessage,
      ...this.devResetUrl(resetUrl),
    };
  }

  @Post('password/reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a new password from a reset token' })
  @ApiOkResponse({ type: PasswordResetConfirmResponseDto })
  async confirmPasswordReset(
    @Body() dto: ResetPasswordDto,
  ): Promise<PasswordResetConfirmResponseDto> {
    const email = await this.authService.consumePasswordResetToken(dto.token);
    if (!email) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user || user.isActive === false) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.setPassword(user.id, dto.password);
    // A password change must not leave other sessions logged in.
    await this.authService.revokeSessionsForEmail(email);

    return { success: true };
  }

  @Get('me')
  @SessionAuth()
  @ApiOperation({ summary: 'Get the currently authenticated principal' })
  @ApiOkResponse({ type: AuthResponseDto })
  async me(@Req() req: AuthenticatedRequest): Promise<AuthResponseDto> {
    if (req.session.principalType === 'candidate') {
      const candidate = await this.candidatesService.findByEmail(
        req.session.email,
      );
      if (!candidate) {
        throw new UnauthorizedException('Session principal no longer exists');
      }
      return {
        user: toCandidateDto(
          candidate,
          this.permissionsService.forSession({
            principalType: 'candidate',
            role: AuthRole.CANDIDATE,
          }),
        ),
      };
    }

    const user = await this.usersService.findByEmail(req.session.email);
    if (!user || user.isActive === false) {
      throw new UnauthorizedException('Session principal no longer exists');
    }
    return {
      user: toUserDto(
        user,
        this.permissionsService.forRole(user.role ?? UserRole.RECRUITER),
      ),
    };
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

  /**
   * Sends an OTP over SMTP. Local development still tolerates a missing mail
   * server, because the API also returns the code in that environment.
   */
  private async deliverOtp(email: string, otp: string): Promise<void> {
    try {
      await this.mailService.sendOtp(email, otp);
    } catch (error) {
      if (this.config.get('nodeEnv', { infer: true }) !== 'local') {
        throw error;
      }
      this.logger.warn(
        `OTP mail failed in local mode: ${(error as Error).message}`,
      );
    }
  }

  /** Exposes the OTP in local development so the flow works without Mailpit. */
  private devOtp(otp: string): { otp?: string } {
    return this.config.get('nodeEnv', { infer: true }) === 'local'
      ? { otp }
      : {};
  }

  /** Exposes the reset link in local development, where Mailpit is used. */
  private devResetUrl(resetUrl: string): { resetUrl?: string } {
    return this.config.get('nodeEnv', { infer: true }) === 'local'
      ? { resetUrl }
      : {};
  }

  /** Client metadata stored with the session (device list, audit). */
  private sessionMeta(req: Request): SessionMetadata {
    return {
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined,
    };
  }
}

function toCandidateDto(
  candidate: Candidate,
  permissions: readonly string[],
): AuthUserDto {
  return {
    id: candidate.id,
    email: candidate.email,
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    role: AuthRole.CANDIDATE,
    principalType: 'candidate',
    permissions: [...permissions],
  };
}

function toUserDto(user: User, permissions: readonly string[]): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? UserRole.RECRUITER,
    principalType: 'user',
    permissions: [...permissions],
  };
}
