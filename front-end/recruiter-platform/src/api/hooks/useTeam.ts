import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { QUERY_KEYS } from './queryKeys';
import {
  acceptInvitation,
  getInvitationPreview,
  getTeam,
  inviteMember,
  resendInvite,
  deleteInvitation,
  updateMember,
} from '../services/team.service';
import { loginSuccess } from '@store/slices/authSlice';
import type {
  AcceptInvitationPayload,
  InviteMemberPayload,
  UpdateMemberPayload,
} from '../schemas/team.schema';
import type { TeamFilters } from '@/types/team.types';

export function useTeam(filters: TeamFilters) {
  return useQuery({
    queryKey: QUERY_KEYS.TEAM.LIST(filters),
    queryFn: () => getTeam(filters),
    placeholderData: (previous) => previous,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteMemberPayload) => inviteMember(payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.ALL }),
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInvite(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.ALL }),
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateMemberPayload;
    }) => updateMember(id, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.ALL }),
  });
}

export function useDeleteInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInvitation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TEAM.ALL }),
  });
}

/** Public onboarding lookup; a bad token simply fails the query. */
export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: QUERY_KEYS.TEAM.INVITATION(token),
    queryFn: () => getInvitationPreview(token),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useAcceptInvitation() {
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: (payload: AcceptInvitationPayload) => acceptInvitation(payload),
    onSuccess: (data) => {
      dispatch(loginSuccess(data.user));
    },
  });
}
