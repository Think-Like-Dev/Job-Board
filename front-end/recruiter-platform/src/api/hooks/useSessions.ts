import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import {
  getAdminSessions,
  getMySessions,
  revokeAdminSession,
  revokeMySession,
  revokeOtherSessions,
  type AdminSessionFilters,
} from '../services/sessions.service';
import type { SessionRow } from '../schemas/sessions.schema';

export function useMySessions() {
  return useQuery({
    queryKey: QUERY_KEYS.SESSIONS.SELF,
    queryFn: getMySessions,
  });
}

export function useRevokeMySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sid: string) => revokeMySession(sid),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS.ALL }),
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => revokeOtherSessions(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS.ALL }),
  });
}

/** Admin lookup: disabled until an email or a principal is provided. */
export function useAdminSessions(filters: AdminSessionFilters, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.SESSIONS.ADMIN(filters),
    queryFn: () => getAdminSessions(filters),
    enabled,
    retry: false,
  });
}

export function useRevokeAdminSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session: Pick<SessionRow, 'id' | 'principalType' | 'principalId'>) =>
      revokeAdminSession(session),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS.ALL }),
  });
}
