// Centralised environment variables configuration

export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL as string,
  MOCK_API: import.meta.env.VITE_MOCK_API === 'true',
} as const;
