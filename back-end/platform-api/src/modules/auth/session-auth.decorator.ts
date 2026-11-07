import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from './session-auth.guard';

export interface SessionAuthOptions {
  /** Adds a controller-wide 403 response when every route uses the same role. */
  forbiddenDescription?: string;
}

/**
 * Composes the decorators every session-guarded controller repeats:
 * the guard, the cookie security scheme, and the 401 response.
 *
 * Apply it to a controller when all routes are guarded, or to individual
 * methods in a mixed controller (for example `AuthController`).
 */
export function SessionAuth(
  options: SessionAuthOptions = {},
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(SessionAuthGuard),
    ApiCookieAuth('session_token'),
    ApiUnauthorizedResponse({ description: 'Invalid or expired session' }),
    ...(options.forbiddenDescription
      ? [ApiForbiddenResponse({ description: options.forbiddenDescription })]
      : []),
  );
}
