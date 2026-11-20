import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { Permission } from './permissions';

/**
 * Reads the effective permission list returned by `GET /auth/me`.
 *
 * Prefer this over comparing `user.role` anywhere in the UI.
 */
export function usePermissions() {
  const permissions = useSelector(
    (state: RootState) => state.auth.user?.permissions ?? [],
  );

  return useMemo(() => {
    const granted = new Set(permissions);
    return {
      permissions,
      can: (permission: Permission) => granted.has(permission),
      canAny: (...required: Permission[]) =>
        required.some((permission) => granted.has(permission)),
    };
  }, [permissions]);
}
