import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth.types';
import {
  SESSION_PRINCIPAL_KEY,
  type SessionPrincipalRequirement,
} from './session-principal';

/**
 * Enforces the principal/role requirement attached by `@SessionAuth()`.
 *
 * `SessionAuthGuard` only proves that a session exists. This guard runs after
 * it and rejects a candidate session on an internal route (or the reverse),
 * which is what keeps `/users`, `/candidates` and recruiter job routes safe.
 */
@Injectable()
export class SessionPrincipalGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement =
      this.reflector.getAllAndOverride<SessionPrincipalRequirement>(
        SESSION_PRINCIPAL_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;

    if (!session) {
      throw new ForbiddenException(
        requirement.forbiddenDescription ?? 'A valid session is required',
      );
    }

    if (
      requirement.principalType &&
      session.principalType !== requirement.principalType
    ) {
      throw new ForbiddenException(
        requirement.forbiddenDescription ??
          defaultForbiddenDescription(requirement.principalType),
      );
    }

    if (
      requirement.roles?.length &&
      !requirement.roles.includes(session.role)
    ) {
      throw new ForbiddenException(
        requirement.forbiddenDescription ??
          'Your role is not allowed to access this resource',
      );
    }

    return true;
  }
}

function defaultForbiddenDescription(
  principalType: 'candidate' | 'user',
): string {
  return principalType === 'candidate'
    ? 'Candidate session required'
    : 'Internal user session required';
}
