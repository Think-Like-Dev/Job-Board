import { ApiError } from '@api/httpClient';

/**
 * Returns the message the API sent, falling back to a translated generic
 * message. Nest validation errors arrive as a flattened string on `ApiError`,
 * so surfacing it tells the user exactly what the server rejected.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
