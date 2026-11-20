import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '@modules/auth/auth.types';
import type { Permission } from './permissions';
import { PERMISSIONS_KEY } from './require-permission.decorator';
import { PermissionsService } from './permissions.service';

/**
 * Enforces the permission list attached by `@RequirePermission()`.
 *
 * Runs after `SessionAuthGuard` (the decorator always composes them together),
 * so `request.session` is guaranteed when this guard executes. A request is
 * allowed when the principal holds **every** required permission.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.session;

    if (!session) {
      throw new ForbiddenException('A valid session is required');
    }

    const granted = this.permissionsService.forSession(session);
    const missing = required.filter(
      (permission) => !granted.includes(permission),
    );

    if (missing.length) {
      throw new ForbiddenException(
        'Your account does not have permission to perform this action',
      );
    }

    return true;
  }
}
