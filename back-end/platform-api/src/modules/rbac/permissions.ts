import { UserRole } from '@common/constants/enums';

/**
 * Permission registry.
 *
 * Permissions are the unit of authorization; roles are only bundles of them.
 * Never check a role in a guard or on a screen — check a permission. That way
 * the bundles can later move to a `role_permissions` table (admin-defined
 * access) without touching a single call site.
 *
 * Naming: `<resource>.<action>` with an optional scope suffix
 * (`user.read.hiring_manager`), so a future row-level scope can reuse it.
 */
export const PERMISSIONS = {
  /** Reach the admin workspace at all. */
  ADMIN_ACCESS: 'admin.access',

  DASHBOARD_READ: 'dashboard.read',

  JOB_READ: 'job.read',
  JOB_CREATE: 'job.create',
  JOB_UPDATE: 'job.update',
  JOB_DELETE: 'job.delete',
  JOB_PUBLISH: 'job.publish',

  APPLICATION_READ: 'application.read',

  CANDIDATE_READ: 'candidate.read',
  CANDIDATE_CREATE: 'candidate.create',
  CANDIDATE_UPDATE: 'candidate.update',
  CANDIDATE_DELETE: 'candidate.delete',

  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_INVITE: 'user.invite',

  SESSION_READ_SELF: 'session.read.self',
  SESSION_READ_ALL: 'session.read.all',
  SESSION_REVOKE_SELF: 'session.revoke.self',
  SESSION_REVOKE_ALL: 'session.revoke.all',

  PROFILE_UPDATE_SELF: 'profile.update.self',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const WORKSPACE_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.DASHBOARD_READ,
  PERMISSIONS.JOB_READ,
  PERMISSIONS.JOB_CREATE,
  PERMISSIONS.JOB_UPDATE,
  PERMISSIONS.JOB_DELETE,
  PERMISSIONS.JOB_PUBLISH,
  PERMISSIONS.APPLICATION_READ,
  PERMISSIONS.CANDIDATE_READ,
  PERMISSIONS.CANDIDATE_CREATE,
  PERMISSIONS.CANDIDATE_UPDATE,
  PERMISSIONS.CANDIDATE_DELETE,
];

const SELF_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.SESSION_READ_SELF,
  PERMISSIONS.SESSION_REVOKE_SELF,
  PERMISSIONS.PROFILE_UPDATE_SELF,
];

/**
 * Static role bundles until access becomes admin-defined.
 *
 * Deliberate current state (see `.agent-memory/HANDOFF.md`): a recruiter may
 * read and create users but not delete them. The full target matrix — scoped
 * to hiring managers, with the invite flow — lands with the admin branch.
 */
export const ROLE_PERMISSIONS: Readonly<
  Record<UserRole, readonly Permission[]>
> = {
  [UserRole.ADMIN]: [
    PERMISSIONS.ADMIN_ACCESS,
    ...WORKSPACE_PERMISSIONS,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_INVITE,
    PERMISSIONS.SESSION_READ_SELF,
    PERMISSIONS.SESSION_READ_ALL,
    PERMISSIONS.SESSION_REVOKE_SELF,
    PERMISSIONS.SESSION_REVOKE_ALL,
    PERMISSIONS.PROFILE_UPDATE_SELF,
  ],
  [UserRole.RECRUITER]: [
    ...WORKSPACE_PERMISSIONS,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_INVITE,
    ...SELF_PERMISSIONS,
  ],
  [UserRole.HIRING_MANAGER]: [...SELF_PERMISSIONS],
};

/** Candidate sessions are a separate product surface with their own bundle. */
export const CANDIDATE_PERMISSIONS: readonly Permission[] = [
  PERMISSIONS.PROFILE_UPDATE_SELF,
  PERMISSIONS.SESSION_READ_SELF,
  PERMISSIONS.SESSION_REVOKE_SELF,
];
