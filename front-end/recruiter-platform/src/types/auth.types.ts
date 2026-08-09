// Shared auth types used across the app, services and Redux slices.

export interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface SendOtpPayload {
  email: string;
  password: string;
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
