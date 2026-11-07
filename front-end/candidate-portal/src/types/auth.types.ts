// Shared auth types used across the app, services and Redux slices.

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role?: string;
  principalType?: 'candidate' | 'user';
}

export interface SendOtpPayload {
  email: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface AuthResponse {
  user: UserProfile;
}

export interface OtpSentResponse {
  message: string;
}
