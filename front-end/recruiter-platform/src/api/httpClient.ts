import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { store } from '@store/index';
import { logout } from '@store/slices/authSlice';
import { ENV } from '../config/env.config';

// ─── ApiError ────────────────────────────────────────────────────────────────

/** Typed error thrown by the HTTP client for all non-2xx responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ─── Payload sanitiser ───────────────────────────────────────────────────────

/**
 * Removes undefined and null values from a plain object before sending.
 * Skips FormData (binary payloads must go through unchanged).
 */
function sanitisePayload(data: unknown): unknown {
  if (data instanceof FormData) return data;
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  // JSON round-trip strips undefined keys (JSON.stringify omits them)
  return JSON.parse(JSON.stringify(data));
}

// ─── Axios instance ──────────────────────────────────────────────────────────

const httpClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  withCredentials: true, // Always send the session cookie
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ─────────────────────────────────────────────────────

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data !== undefined) {
    config.data = sanitisePayload(config.data);
  }
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const status = error.response?.status ?? 0;
    const responseData = error.response?.data as Record<string, string> | undefined;
    const message = responseData?.message ?? error.message ?? 'An unexpected error occurred';

    // Session expired or forbidden — clear Redux state and redirect to landing
    if (status === 401 || status === 403) {
      store.dispatch(logout());
      // Replace so the user cannot navigate back to a protected page
      window.location.replace('/');
    }

    return Promise.reject(new ApiError(status, message, error.response?.data));
  },
);

// ─── Typed API helpers ───────────────────────────────────────────────────────
// Unwrap AxiosResponse so services receive T directly (not AxiosResponse<T>).

export const api = {
  async get<T>(url: string, config?: Parameters<typeof httpClient.get>[1]): Promise<T> {
    return await httpClient.get<T>(url, config).then((r) => r.data);
  },

  async post<T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof httpClient.post>[2],
  ): Promise<T> {
    return await httpClient.post<T>(url, data, config).then((r) => r.data);
  },

  async put<T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof httpClient.put>[2],
  ): Promise<T> {
    return await httpClient.put<T>(url, data, config).then((r) => r.data);
  },
  async patch<T>(
    url: string,
    data?: unknown,
    config?: Parameters<typeof httpClient.patch>[2],
  ): Promise<T> {
    return await httpClient.patch<T>(url, data, config).then((r) => r.data);
  },
  async delete<T>(url: string, config?: Parameters<typeof httpClient.delete>[1]): Promise<T> {
    return await httpClient.delete<T>(url, config).then((r) => r.data);
  },
};

export default httpClient;
