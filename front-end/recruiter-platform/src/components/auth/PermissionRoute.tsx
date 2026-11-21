import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/permissions/usePermissions';
import type { Permission } from '@/permissions/permissions';

interface PermissionRouteProps {
  permission: Permission;
  children: ReactNode;
}

/**
 * Route-level gate. A signed-in user without the permission is sent back to
 * the workspace root instead of seeing a page they cannot use.
 *
 * Pair with `React.lazy` so the page chunk is only fetched when it is opened.
 */
export default function PermissionRoute({
  permission,
  children,
}: PermissionRouteProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
