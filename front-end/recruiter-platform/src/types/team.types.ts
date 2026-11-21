import type { UserRole } from './auth.types';

/** Mirrors `UserStatus` in the API. */
export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface TeamMember {
  id: string;
  name?: string | null;
  firstName?: string;
  lastName?: string;
  phone?: string;
  jobTitle?: string;
  email: string;
  role?: UserRole;
  status: UserStatus;
  isActive: boolean;
  invitedAt?: string;
  inviteExpiresAt?: string;
  lastInviteSentAt?: string;
  inviteSendCount: number;
  onboardedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface TeamListResponse {
  data: TeamMember[];
  meta: TeamMeta;
}

export interface InvitationPreview {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  expiresAt: string;
}

export interface InvitationResult {
  user: TeamMember;
  invitationUrl: string;
}

export interface TeamFilters {
  page: number;
  limit: number;
  search?: string;
  status?: UserStatus;
}
