import { Controller, Delete, Get, Param, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@modules/rbac/permissions';
import { RequirePermission } from '@modules/rbac/require-permission.decorator';
import { SessionAuth } from './session-auth.decorator';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { SessionListResponseDto } from './auth.dto';

/**
 * The signed-in account's own sessions (users and candidates alike).
 * Rows never contain the token — revocation happens through the public `sid`.
 */
@ApiTags('sessions')
@SessionAuth()
@Controller('auth/sessions')
export class SessionsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SESSION_READ_SELF)
  @ApiOperation({ summary: 'List the sessions of the signed-in account' })
  @ApiOkResponse({ type: SessionListResponseDto })
  async list(
    @Req() req: AuthenticatedRequest,
  ): Promise<SessionListResponseDto> {
    return { data: await this.authService.listSessions(req.session) };
  }

  @Delete(':sid')
  @RequirePermission(PERMISSIONS.SESSION_REVOKE_SELF)
  @ApiOperation({ summary: 'Revoke one of your own sessions' })
  async revoke(
    @Req() req: AuthenticatedRequest,
    @Param('sid') sid: string,
  ): Promise<{ revoked: boolean }> {
    return {
      revoked: await this.authService.revokeSession(
        req.session.principalType,
        req.session.principalId,
        sid,
      ),
    };
  }

  @Delete()
  @RequirePermission(PERMISSIONS.SESSION_REVOKE_SELF)
  @ApiOperation({ summary: 'Revoke every other session of this account' })
  async revokeOthers(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ revoked: number }> {
    return { revoked: await this.authService.revokeOtherSessions(req.session) };
  }
}
