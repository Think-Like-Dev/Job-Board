import type { ReactNode } from 'react';
import { usePermissions } from '@/permissions/usePermissions';
import type { Permission } from '@/permissions/permissions';

interface CanProps {
  permission: Permission;
  children: ReactNode;
  /** Rendered when the permission is missing. Nothing by default. */
  fallback?: ReactNode;
}

/**
 * Hides an action the signed-in user may not perform.
 *
 * This is UX only — the matching API route is guarded by `@RequirePermission`
 * and stays the real boundary.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
