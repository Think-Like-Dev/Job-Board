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
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    phone: user.phone ?? undefined,
    jobTitle: user.jobTitle ?? undefined,
    email: user.email,
    role: user.role,
    status: user.status,
    isActive: user.isActive,
    invitedAt: toIsoString(user.invitedAt),
    inviteExpiresAt: toIsoString(user.inviteExpiresAt),
    lastInviteSentAt: toIsoString(user.lastInviteSentAt),
    inviteSendCount: user.inviteSendCount ?? 0,
    onboardedAt: toIsoString(user.onboardedAt),
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
