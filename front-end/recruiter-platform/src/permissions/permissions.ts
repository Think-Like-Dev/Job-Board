/**
 * Client mirror of `back-end/platform-api/src/modules/rbac/permissions.ts`.
 *
 * The SPA never decides by role: it asks `can('job.read')`. Keep the strings in
 * sync with the backend — a mismatch only hides or shows UI, the API guard is
 * the real boundary.
 */
export const PERMISSIONS = {
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
