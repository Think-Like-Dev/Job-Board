import { parseSchema } from '@/lib/schemaValidation';
import { API_ENDPOINTS } from '../endpoints.config';
import { api } from '../httpClient';
import {
  SessionListResponseSchema,
  type SessionRow,
} from '../schemas/sessions.schema';

export async function getMySessions(): Promise<SessionRow[]> {
  const response = await api.get<unknown>(API_ENDPOINTS.AUTH.SESSIONS);
  const parsed = parseSchema(
    SessionListResponseSchema,
    response,
    'getMySessions Response',
  );
  return parsed.data;
}

export async function revokeMySession(sid: string): Promise<boolean> {
  const response = await api.delete<{ revoked: boolean }>(
    API_ENDPOINTS.AUTH.SESSION_REVOKE(sid),
  );
  return response.revoked;
}

export async function revokeOtherSessions(): Promise<number> {
  const response = await api.delete<{ revoked: number }>(
    API_ENDPOINTS.AUTH.SESSIONS,
  );
  return response.revoked;
}

export interface AdminSessionFilters {
  email?: string;
  principalType?: 'candidate' | 'user';
  principalId?: string;
}

export async function getAdminSessions(
  filters: AdminSessionFilters,
): Promise<SessionRow[]> {
  const response = await api.get<unknown>(API_ENDPOINTS.ADMIN.SESSIONS, {
    params: filters,
  });
  const parsed = parseSchema(
    SessionListResponseSchema,
    response,
    'getAdminSessions Response',
  );
  return parsed.data;
}

export async function revokeAdminSession(
  session: Pick<SessionRow, 'id' | 'principalType' | 'principalId'>,
): Promise<boolean> {
  const response = await api.delete<{ revoked: boolean }>(
    API_ENDPOINTS.ADMIN.SESSION_REVOKE(
      session.id,
      session.principalType,
      session.principalId,
    ),
  );
  return response.revoked;
}
