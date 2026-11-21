export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/otp/verify',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    RESET_PASSWORD_REQUEST: '/auth/password/reset/request',
    RESET_PASSWORD_CONFIRM: '/auth/password/reset/confirm',
    INVITATION_PREVIEW: (token: string) => `/auth/invitation/${token}`,
    INVITATION_ACCEPT: '/auth/invitation/accept',
    SESSIONS: '/auth/sessions',
    SESSION_REVOKE: (sid: string) => `/auth/sessions/${sid}`,
  },
  ADMIN: {
    SESSIONS: '/admin/sessions',
    SESSION_REVOKE: (sid: string, principalType: string, principalId: string) =>
      `/admin/sessions/${sid}?principalType=${principalType}&principalId=${principalId}`,
  },
  USERS: {
    LIST: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    DELETE_INVITATION: (id: string) => `/users/${id}/invitation`,
    RESEND_INVITE: (id: string) => `/users/${id}/invite/resend`,
  },
  JOBS: {
    GET_ALL: '/jobs',
    CREATE: '/jobs',
    UPDATE: (id: string)=>`/jobs/${id}`,
    GET_DETAILS: (id: string) => `/jobs/${id}`,
    PATCH: (id: string)=>`/jobs/${id}/status`,
    DELETE: (id: string) => `/jobs/${id}`,
    ARCHIVE_PREVIEW: (id: string) => `/jobs/${id}/archive-preview`,
  },
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
    UPLOAD_PIC: '/profile/picture',
    UPLOAD_RESUME: '/profile/resume',
  },
  APPLICATIONS: {
    LIST_BY_JOB: (jobId: string) => `/jobs/${jobId}/applications`,
    GET_DETAILS: (id: string) => `/applications/${id}`,
  },
  CANDIDATES: {
    GET_ALL: '/candidates',
    CREATE: '/candidates',
    GET_DETAILS: (id: string) => `/candidates/${id}`,
    DELETE: (id: string) => `/candidates/${id}`,
    LIST_APPLICATIONS: (id: string) => `/candidates/${id}/applications`,
  },
  SKILLS: {
    SEARCH: '/skills',
  },
  FILES: {
    CONTENT: (id: string) => `/files/${id}/content`,
  },
  NOTIFICATIONS: {
    STREAM: '/notifications/stream',
  },
};
