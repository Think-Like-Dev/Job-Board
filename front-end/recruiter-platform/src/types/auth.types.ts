// Shared auth types used across the app, services and Redux slices.

export enum UserRole {
  ADMIN = 'ADMIN',
  RECRUITER = 'RECRUITER',
  HIRING_MANAGER = 'HIRING_MANAGER',
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: UserRole;
  principalType?: 'candidate' | 'user';
}

export interface LoginPayload {
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

export interface LoginResponse {
  success: boolean;
  otpRequired: boolean;
  message: string;
  otp?: string;
}
