import { z } from 'zod';

// ─── Response Schemas ────────────────────────────────────────────────────────

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
});

export const OtpSentResponseSchema = z.object({
  message: z.string(),
});

// ─── Request Payload Schemas ─────────────────────────────────────────────────

export const SendOtpPayloadSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

export const VerifyOtpPayloadSchema = z.object({
  email: z.email(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type UserProfileSchema = z.infer<typeof UserProfileSchema>;
export type AuthResponseSchema = z.infer<typeof AuthResponseSchema>;
