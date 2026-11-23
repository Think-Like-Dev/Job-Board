import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import { PERMISSIONS } from '@modules/rbac/permissions';
import { RequirePermission } from '@modules/rbac/require-permission.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserListResponseDto,
  UserQueryDto,
  UserResponseDto,
} from './user.dto';
import { toUserPage, toUserResponse } from './user.presenter';

/** Team management: invitations, the directory and profile updates. */
@ApiTags('users')
@SessionAuth({ principalType: 'user' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission(PERMISSIONS.USER_INVITE)
  @ApiOperation({ summary: 'Invite an internal user' })
  @ApiCreatedResponse({ type: UserResponseDto })
  async invite(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ): Promise<{ user: UserResponseDto; invitationUrl: string }> {
    const result = await this.usersService.inviteUser(req.session, dto);
    return {
      user: toUserResponse(result.user),
      invitationUrl: result.invitationUrl,
    };
  }

  @Get()
  @RequirePermission(PERMISSIONS.USER_READ)
  @ApiOperation({ summary: 'List the users this account may manage' })
  @ApiOkResponse({ type: UserListResponseDto })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: UserQueryDto,
  ): Promise<UserListResponseDto> {
    return toUserPage(await this.usersService.listForActor(req.session, query));
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USER_READ)
  @ApiOperation({ summary: 'Get one user' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<UserResponseDto> {
    return toUserResponse(
      await this.usersService.readForActor(req.session, id),
    );
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.USER_UPDATE)
  @ApiOperation({ summary: 'Update a user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return toUserResponse(
      await this.usersService.updateUserByActor(req.session, id, dto),
    );
  }

  @Delete(':id/invitation')
  @RequirePermission(PERMISSIONS.USER_INVITE)
  @ApiOperation({ summary: 'Delete a pending invitation (hard delete)' })
  async deleteInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<boolean> {
    return this.usersService.deleteInvitationByActor(req.session, id);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.USER_DELETE)
  @ApiOperation({ summary: 'Soft-delete a user (admin only)' })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<boolean> {
    return this.usersService.deleteUserByActor(req.session, id);
  }

  @Post(':id/invite/resend')
  @RequirePermission(PERMISSIONS.USER_INVITE)
  @ApiOperation({ summary: 'Resend a pending invitation' })
  async resend(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ user: UserResponseDto; invitationUrl: string }> {
    const result = await this.usersService.resendInvitation(req.session, id);
    return {
      user: toUserResponse(result.user),
      invitationUrl: result.invitationUrl,
    };
  }
}
