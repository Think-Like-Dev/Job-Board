import { Module } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';

/**
 * Permission registry, resolver and guard.
 *
 * Import this module wherever `@RequirePermission()` is used; it depends on
 * nothing, so it is safe to import from any feature module.
 */
@Module({
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class RbacModule {}
