import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionPrincipalGuard } from './session-principal.guard';
import {
  SESSION_PRINCIPAL_KEY,
  type SessionPrincipalRequirement,
  type SessionPrincipalType,
} from './session-principal';

export interface SessionAuthOptions {
  /** Rejects the request when the session belongs to the other principal. */
  principalType?: SessionPrincipalType;
  /** Optional role allow-list, checked against `session.role`. */
  roles?: readonly string[];
  /** Adds a controller-wide 403 response with this description. */
  forbiddenDescription?: string;
}

/**
 * Composes the decorators every session-guarded controller repeats:
 * the guard, the cookie security scheme, and the 401 response.
 *
 * Pass `principalType` or `roles` to enforce authorization in the same place:
 * `@SessionAuth({ principalType: 'user' })` rejects candidate sessions.
 *
 * Apply it to a controller when all routes are guarded, or to individual
 * methods in a mixed controller (for example `AuthController`).
 */
export function SessionAuth(
  options: SessionAuthOptions = {},
): ClassDecorator & MethodDecorator {
  const requirement: SessionPrincipalRequirement = {
    principalType: options.principalType,
    roles: options.roles,
    forbiddenDescription: options.forbiddenDescription,
  };
  const forbiddenDescription =
    options.forbiddenDescription ?? defaultForbiddenDescription(options);

  return applyDecorators(
    SetMetadata(SESSION_PRINCIPAL_KEY, requirement),
    UseGuards(SessionAuthGuard, SessionPrincipalGuard),
    ApiCookieAuth('session_token'),
    ApiUnauthorizedResponse({ description: 'Invalid or expired session' }),
    ...(forbiddenDescription
      ? [ApiForbiddenResponse({ description: forbiddenDescription })]
      : []),
  );
}

function defaultForbiddenDescription(
  options: SessionAuthOptions,
): string | undefined {
  if (options.principalType === 'candidate') {
    return 'Candidate session required';
  }
  if (options.principalType === 'user') {
    return 'Internal user session required';
  }
  if (options.roles?.length) {
    return 'Your role is not allowed to access this resource';
  }
  return undefined;
}
