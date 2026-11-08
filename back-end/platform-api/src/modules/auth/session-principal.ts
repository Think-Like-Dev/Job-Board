import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.types';

/** Metadata key read by `SessionPrincipalGuard`. */
export const SESSION_PRINCIPAL_KEY = 'session:principal';

/** The two session principals supported by the auth model. */
export type SessionPrincipalType = 'candidate' | 'user';

/** Optional principal/role restriction attached by `@SessionAuth()`. */
export interface SessionPrincipalRequirement {
  principalType?: SessionPrincipalType;
  roles?: readonly string[];
  forbiddenDescription?: string;
}

/** Candidate-only endpoints (apply, own applications, withdraw, draft delete). */
export function assertCandidateSession(req: AuthenticatedRequest): void {
  if (req.session.principalType !== 'candidate') {
    throw new ForbiddenException('Only candidates can access this resource');
  }
}

/** Internal-user endpoints (recruiters, admins, hiring managers). */
export function assertInternalUserSession(req: AuthenticatedRequest): void {
  if (req.session.principalType !== 'user') {
    throw new ForbiddenException(
      'Only internal users can access this resource',
    );
  }
}
