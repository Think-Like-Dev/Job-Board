// Shared profile domain types.

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  grade?: string;
  gpa?: string;
  additionalDetails?: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  salary?: string;
  additionalDetails?: string;
}

export interface CandidateProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  resumeUrl?: string;
  education: Education[];
  experience: Experience[];
  skills?: string[];
  portfolioUrl?: string;
  linkedinUrl?: string;
}

export type UpdateProfilePayload = Partial<
  Omit<CandidateProfile, 'id' | 'email' | 'avatarUrl' | 'resumeUrl'>
>;

export interface UploadResponse {
  url: string;
  filename: string;
}
