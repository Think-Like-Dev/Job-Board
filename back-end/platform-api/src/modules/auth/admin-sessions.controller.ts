import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@modules/rbac/permissions';
import { RequirePermission } from '@modules/rbac/require-permission.decorator';
import { UsersService } from '@modules/users/users.service';
import { CandidatesService } from '@modules/candidates/candidates.service';
import { SessionAuth } from './session-auth.decorator';
import { AuthService } from './auth.service';
import { AdminSessionsQueryDto, SessionListResponseDto } from './auth.dto';

/**
 * Admin view of every live session: filter by principal or email, or list
 * everything. Revocation needs the principal because `sid` is scoped to it.
 */
@ApiTags('admin')
@SessionAuth({ principalType: 'user' })
@Controller('admin/sessions')
export class AdminSessionsController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly candidatesService: CandidatesService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.SESSION_READ_ALL)
  @ApiOperation({
    summary: 'List live sessions (filter by principal or email)',
  })
  @ApiOkResponse({ type: SessionListResponseDto })
  async list(
    @Query() query: AdminSessionsQueryDto,
  ): Promise<SessionListResponseDto> {
    if (query.principalType && query.principalId) {
      return {
        data: await this.authService.listSessionsFor(
          query.principalType,
          query.principalId,
        ),
      };
    }

    if (query.email) {
      const user = await this.usersService.findByEmail(query.email);
      if (user) {
        return {
          data: await this.authService.listSessionsFor('user', user.id),
        };
      }
      const candidate = await this.candidatesService.findByEmail(query.email);
      if (candidate) {
        return {
          data: await this.authService.listSessionsFor(
            'candidate',
            candidate.id,
          ),
        };
      }
      return { data: [] };
    }

    return { data: await this.authService.listAllSessions() };
  }

  @Delete(':sid')
  @RequirePermission(PERMISSIONS.SESSION_REVOKE_ALL)
  @ApiOperation({ summary: 'Revoke a session of a given principal' })
  async revoke(
    @Param('sid') sid: string,
    @Query() query: AdminSessionsQueryDto,
  ): Promise<{ revoked: boolean }> {
    if (!query.principalType || !query.principalId) {
      throw new BadRequestException(
        'principalType and principalId are required to revoke a session',
      );
    }

    return {
      revoked: await this.authService.revokeSession(
        query.principalType,
        query.principalId,
        sid,
      ),
    };
  }
}
