import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import type { User } from './user.schema';
import { UserListResponseDto, UserResponseDto } from './user.dto';

function toIsoString(value?: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

/** Maps a persisted user to the safe, frontend-facing shape. */
export function toUserResponse(user: User): UserResponseDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}

export function toUserPage(page: IPaginatedResult<User>): UserListResponseDto {
  return {
    data: page.data.map(toUserResponse),
    meta: page.meta,
  };
}
