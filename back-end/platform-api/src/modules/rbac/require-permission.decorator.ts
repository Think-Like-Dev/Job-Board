import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiForbiddenResponse } from '@nestjs/swagger';
import { PermissionsGuard } from './permissions.guard';
import type { Permission } from './permissions';

/** Metadata key read by `PermissionsGuard`. */
export const PERMISSIONS_KEY = 'rbac:permissions';

/**
 * Protects a route with one or more permissions.
 *
 * A request is allowed when the principal holds **every** listed permission.
 * Apply it to a controller that already carries `@SessionAuth(...)`: the class
 * guard runs first (Nest concatenates class guards before method guards), so
 * the session is resolved by the time `PermissionsGuard` executes.
 *
 * ```ts
 * @SessionAuth({ principalType: 'user' })
 * @Controller('users')
 * class UsersController {
 *   @RequirePermission(PERMISSIONS.USER_CREATE)
 *   @Post()
 *   create() {}
 * }
 * ```
 */
export function RequirePermission(
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(PermissionsGuard),
    ApiForbiddenResponse({
      description:
        'Your account does not have permission to perform this action',
    }),
  );
}
