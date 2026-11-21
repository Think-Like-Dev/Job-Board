import { z } from 'zod';
import { UserRole } from '@/types/auth.types';
import { UserStatus } from '@/types/team.types';

export const TeamMemberSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  email: z.email(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus),
  isActive: z.boolean(),
  invitedAt: z.string().optional(),
  inviteExpiresAt: z.string().optional(),
  lastInviteSentAt: z.string().optional(),
  inviteSendCount: z.number(),
  onboardedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const TeamListResponseSchema = z.object({
  data: z.array(TeamMemberSchema),
  meta: z.object({
    totalItems: z.number(),
    itemCount: z.number(),
    itemsPerPage: z.number(),
    totalPages: z.number(),
    currentPage: z.number(),
  }),
});

export const InviteMemberResponseSchema = z.object({
  user: TeamMemberSchema,
  invitationUrl: z.string(),
});

export const InviteMemberPayloadSchema = z.object({
  email: z.email(),
  role: z.enum(UserRole),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const UpdateMemberPayloadSchema = z.object({
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
});

export const InvitationPreviewSchema = z.object({
  email: z.email(),
  role: z.enum(UserRole),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  expiresAt: z.string(),
});

export const AcceptInvitationPayloadSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  jobTitle: z.string().min(1),
});

export type InviteMemberPayload = z.infer<typeof InviteMemberPayloadSchema>;
export type UpdateMemberPayload = z.infer<typeof UpdateMemberPayloadSchema>;
export type AcceptInvitationPayload = z.infer<
  typeof AcceptInvitationPayloadSchema
>;
