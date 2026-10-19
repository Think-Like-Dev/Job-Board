import { z } from 'zod';
import { UserRole } from '@/types/auth.types';

// ─── Response Schemas ────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.enum(UserRole).optional(),
  principalType: z.enum(['candidate', 'user']).optional(),
});

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
});

export const LoginResponseSchema = z.object({
  success: z.boolean(),
  otpRequired: z.boolean(),
  message: z.string(),
  otp: z.string().optional(),
});

// ─── Request Payload Schemas ─────────────────────────────────────────────────

export const LoginPayloadSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

export const VerifyOtpPayloadSchema = z.object({
  email: z.email(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type UserProfileSchema = z.infer<typeof UserProfileSchema>;
export type AuthResponseSchema = z.infer<typeof AuthResponseSchema>;
export type LoginResponseSchema = z.infer<typeof LoginResponseSchema>;
export type LoginPayloadSchema = z.infer<typeof LoginPayloadSchema>;
export type VerifyOtpPayloadSchema = z.infer<typeof VerifyOtpPayloadSchema>;
