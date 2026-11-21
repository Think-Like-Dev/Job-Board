import { parseSchema } from '@/lib/schemaValidation';
import { API_ENDPOINTS } from '../endpoints.config';
import { api } from '../httpClient';
import { AuthResponseSchema } from '../schemas/auth.schema';
import {
  AcceptInvitationPayloadSchema,
  InvitationPreviewSchema,
  InviteMemberPayloadSchema,
  InviteMemberResponseSchema,
  TeamListResponseSchema,
  UpdateMemberPayloadSchema,
  TeamMemberSchema,
  type AcceptInvitationPayload,
  type InviteMemberPayload,
  type UpdateMemberPayload,
} from '../schemas/team.schema';
import type {
  InvitationPreview,
  InvitationResult,
  TeamFilters,
  TeamListResponse,
  TeamMember,
} from '@/types/team.types';
import type { AuthResponse } from '@/types/auth.types';

/** Team directory (scoped server-side by the actor's role). */
export async function getTeam(filters: TeamFilters): Promise<TeamListResponse> {
  const response = await api.get<unknown>(API_ENDPOINTS.USERS.LIST, {
    params: filters,
  });
  return parseSchema(TeamListResponseSchema, response, 'getTeam Response');
}

export async function inviteMember(
  payload: InviteMemberPayload,
): Promise<InvitationResult> {
  const validated = parseSchema(
    InviteMemberPayloadSchema,
    payload,
    'inviteMember',
  );
  const response = await api.post<unknown>(API_ENDPOINTS.USERS.LIST, validated);
  return parseSchema(
    InviteMemberResponseSchema,
    response,
    'inviteMember Response',
  );
}

export async function resendInvite(id: string): Promise<InvitationResult> {
  const response = await api.post<unknown>(
    API_ENDPOINTS.USERS.RESEND_INVITE(id),
  );
  return parseSchema(
    InviteMemberResponseSchema,
    response,
    'resendInvite Response',
  );
}

export async function updateMember(
  id: string,
  payload: UpdateMemberPayload,
): Promise<TeamMember> {
  const validated = parseSchema(
    UpdateMemberPayloadSchema,
    payload,
    'updateMember',
  );
  const response = await api.patch<unknown>(
    API_ENDPOINTS.USERS.UPDATE(id),
    validated,
  );
  return parseSchema(TeamMemberSchema, response, 'updateMember Response');
}

export async function revokeInvite(id: string): Promise<void> {
  await api.delete(API_ENDPOINTS.USERS.DELETE(id));
}

export async function getInvitationPreview(
  token: string,
): Promise<InvitationPreview> {
  const response = await api.get<unknown>(
    API_ENDPOINTS.AUTH.INVITATION_PREVIEW(token),
  );
  return parseSchema(
    InvitationPreviewSchema,
    response,
    'getInvitationPreview Response',
  );
}

export async function acceptInvitation(
  payload: AcceptInvitationPayload,
): Promise<AuthResponse> {
  const validated = parseSchema(
    AcceptInvitationPayloadSchema,
    payload,
    'acceptInvitation',
  );
  const response = await api.post<unknown>(
    API_ENDPOINTS.AUTH.INVITATION_ACCEPT,
    validated,
  );
  return parseSchema(
    AuthResponseSchema,
    response,
    'acceptInvitation Response',
  );
}
