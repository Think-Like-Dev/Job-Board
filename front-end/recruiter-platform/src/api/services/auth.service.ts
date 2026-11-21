import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from "@lib/schemaValidation";
import {
  AuthResponseSchema,
  LoginPayloadSchema,
  LoginResponseSchema,
  PasswordResetConfirmResponseSchema,
  PasswordResetRequestResponseSchema,
  RequestPasswordResetPayloadSchema,
  ResetPasswordPayloadSchema,
  VerifyOtpPayloadSchema,
} from '../schemas/auth.schema';
import type { LoginPayload, VerifyOtpPayload, AuthResponse, LoginResponse, UserProfile } from '@/types/auth.types';

/** Recruiter login step 1: validates email + password and sends an OTP. */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const validatedPayload = parseSchema(LoginPayloadSchema, payload, 'login');
  const response = await api.post<unknown>(API_ENDPOINTS.AUTH.LOGIN, validatedPayload);
  return parseSchema(LoginResponseSchema, response, 'login Response');
}

/** Recruiter login step 2: verifies the OTP and starts the session. */
export async function verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponse> {
  const validatedPayload = parseSchema(VerifyOtpPayloadSchema, payload, 'verifyOtp');
  const response = await api.post<unknown>(API_ENDPOINTS.AUTH.VERIFY_OTP, validatedPayload);
  return parseSchema(AuthResponseSchema, response, 'verifyOtp Response');
}

export async function getMe(): Promise<UserProfile> {
  const response = await api.get<unknown>(API_ENDPOINTS.AUTH.ME);
  const parsed = parseSchema(AuthResponseSchema, response, 'getMe Response');
  return parsed.user;
}

export async function logoutUser(): Promise<void> {
  await api.post(API_ENDPOINTS.AUTH.LOGOUT);
}

/** Asks the API to email a reset link. Always resolves, even for unknown mail. */
export async function requestPasswordReset(payload: { email: string }) {
  const validated = parseSchema(
    RequestPasswordResetPayloadSchema,
    payload,
    'requestPasswordReset',
  );
  const response = await api.post<unknown>(
    API_ENDPOINTS.AUTH.RESET_PASSWORD_REQUEST,
    validated,
  );
  return parseSchema(
    PasswordResetRequestResponseSchema,
    response,
    'requestPasswordReset Response',
  );
}

/** Exchanges the emailed token for a new password. */
export async function confirmPasswordReset(payload: {
  token: string;
  password: string;
}) {
  const validated = parseSchema(
    ResetPasswordPayloadSchema,
    payload,
    'confirmPasswordReset',
  );
  const response = await api.post<unknown>(
    API_ENDPOINTS.AUTH.RESET_PASSWORD_CONFIRM,
    validated,
  );
  return parseSchema(
    PasswordResetConfirmResponseSchema,
    response,
    'confirmPasswordReset Response',
  );
}
