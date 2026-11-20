import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SessionAuth } from '@modules/auth/session-auth.decorator';
import { PERMISSIONS } from '@modules/rbac/permissions';
import { RequirePermission } from '@modules/rbac/require-permission.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserListResponseDto,
  UserResponseDto,
} from './user.dto';
import { toUserPage, toUserResponse } from './user.presenter';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('users')
@SessionAuth({ principalType: 'user' })
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermission(PERMISSIONS.USER_CREATE)
  @ApiOperation({ summary: 'Create a user (internal: recruiter/admin)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return toUserResponse(await this.usersService.createUser(dto));
  }

  @Get()
  @RequirePermission(PERMISSIONS.USER_READ)
  @ApiOperation({ summary: 'List users (paginated)' })
  @ApiOkResponse({ type: UserListResponseDto })
  async findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<UserListResponseDto> {
    return toUserPage(await this.usersService.findAllPaginated(query));
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USER_READ)
  @ApiOperation({ summary: 'Get one user' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return toUserResponse(await this.usersService.findOne({ id }));
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.USER_UPDATE)
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return toUserResponse(await this.usersService.updateUser(id, dto));
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.USER_DELETE)
  @ApiOperation({ summary: 'Delete a user' })
  async remove(@Param('id') id: string): Promise<boolean> {
    return this.usersService.remove({ id });
  }
}
