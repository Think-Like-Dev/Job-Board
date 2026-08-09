export const API_ENDPOINTS = {
  AUTH: {
    LOGIN_OTP: '/auth/login/otp',
    VERIFY_OTP: '/auth/verify-otp',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  JOBS: {
    GET_ALL: '/jobs',
    CREATE: '/jobs',
    UPDATE: (id: number)=>`/jobs/${id}`,
    GET_DETAILS: (id: number) => `/jobs/${id}`,
    PATCH: (id: number)=>`/jobs/${id}/status`,
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
