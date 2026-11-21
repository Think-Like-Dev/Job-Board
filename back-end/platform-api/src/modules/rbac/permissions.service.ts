import { Injectable } from '@nestjs/common';
import type { SessionPayload } from '@modules/auth/auth.service';
import {
  CANDIDATE_PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
} from './permissions';

/**
 * Resolves the effective permission set for a principal.
 *
 * Today the answer comes from the static role bundles in `permissions.ts`.
 * When access becomes data-driven (a `role_permissions`/`user_permissions`
 * table written by an admin), only this service changes — guards and the SPA
 * read permissions, never roles.
 */
@Injectable()
export class PermissionsService {
  /** Bundle for a raw user role. Unknown or missing roles grant nothing. */
  forRole(role?: string | null): readonly Permission[] {
    if (!role) return [];
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
  }

  /** Bundle for an authenticated session (candidates included). */
  forSession(session: Pick<SessionPayload, 'principalType' | 'role'>) {
    return session.principalType === 'candidate'
      ? CANDIDATE_PERMISSIONS
      : this.forRole(session.role);
  }

  /** Convenience check used by services that need a policy decision. */
  has(
    session: Pick<SessionPayload, 'principalType' | 'role'>,
    permission: string,
  ) {
    return this.forSession(session).includes(permission as Permission);
  }
}
