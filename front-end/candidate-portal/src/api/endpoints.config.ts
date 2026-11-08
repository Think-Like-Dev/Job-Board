export const API_ENDPOINTS = {
  AUTH: {
    LOGIN_OTP: '/auth/otp/request',
    VERIFY_OTP: '/auth/otp/verify',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  JOBS: {
    GET_ALL: '/public/jobs',
    GET_DETAILS: (id: string) => `/public/jobs/${id}`,
  },
  BOOKMARKS: {
    GET_ALL: '/bookmarks',
    ADD: (jobId: string) => `/bookmarks/${jobId}`,
    REMOVE: (jobId: string) => `/bookmarks/${jobId}`,
  },
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
  },
  FILES: {
    UPLOAD: '/files',
    CONTENT: (id: string) => `/files/${id}/content`,
    DELETE: (id: string) => `/files/${id}`,
  },
  SKILLS: {
    SEARCH: '/skills',
    CREATE: '/skills',
  },
  APPLICATIONS: {
    GET_ALL: '/applications/my',
    GET_DETAILS: (id: string) => `/applications/my/${id}`,
    APPLY: (jobId: string) => `/jobs/${jobId}/apply`,
    WITHDRAW: (id: string) => `/applications/${id}/withdraw`,
    DELETE: (id: string) => `/applications/${id}`,
  },
  NOTIFICATIONS: {
    STREAM: '/notifications/stream',
  },
} as const;
