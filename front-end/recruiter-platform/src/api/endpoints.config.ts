export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    VERIFY_OTP: '/auth/otp/verify',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
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
