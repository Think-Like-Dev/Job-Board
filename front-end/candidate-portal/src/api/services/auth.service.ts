import { api } from '../httpClient';
import { API_ENDPOINTS } from '../endpoints.config';
import { parseSchema } from '../../utils/schemaValidation';
import {
  AuthResponseSchema,
  OtpSentResponseSchema,
  SendOtpPayloadSchema,
  VerifyOtpPayloadSchema,
} from '../schemas/auth.schema';
import type { SendOtpPayload, VerifyOtpPayload, AuthResponse, OtpSentResponse, UserProfile } from '../../types/auth.types';

export async function sendOtp(payload: SendOtpPayload): Promise<OtpSentResponse> {
  const validatedPayload = parseSchema(SendOtpPayloadSchema, payload, 'sendOtp');
  const response = await api.post<unknown>(API_ENDPOINTS.AUTH.LOGIN_OTP, validatedPayload);
  return parseSchema(OtpSentResponseSchema, response, 'sendOtp Response');
}

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
