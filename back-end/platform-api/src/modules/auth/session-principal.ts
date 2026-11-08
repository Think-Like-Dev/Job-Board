import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.types';

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
