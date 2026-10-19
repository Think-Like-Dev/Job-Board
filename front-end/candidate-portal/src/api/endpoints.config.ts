export const API_ENDPOINTS = {
  AUTH: {
    LOGIN_OTP: '/auth/otp/request',
    VERIFY_OTP: '/auth/otp/verify',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  JOBS: {
    GET_ALL: '/jobs',
    GET_DETAILS: (id: string) => `/jobs/${id}`,
    BOOKMARK: (id: string) => `/jobs/${id}/bookmark`,
    REMOVE_BOOKMARK: (id: string) => `/jobs/${id}/bookmark`,
    GET_BOOKMARKS: '/jobs/bookmarks',
  },
  PROFILE: {
    GET: '/profile',
    UPDATE: '/profile',
    UPLOAD_PIC: '/profile/picture',
    UPLOAD_RESUME: '/profile/resume',
  },
  APPLICATIONS: {
    GET_ALL: '/applications',
    GET_DETAILS: (id: string) => `/applications/${id}`,
    APPLY: (jobId: string) => `/jobs/${jobId}/apply`,
    WITHDRAW: (id: string) => `/applications/${id}/withdraw`,
    RESPOND_OFFER: (id: string) => `/applications/${id}/offer-response`,
  },
  NOTIFICATIONS: {
    STREAM: '/notifications/stream',
  },
};
