/** Shared profile domain types. */

export interface ProfileFile {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  url: string;
  downloadUrl: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  gpa?: string | null;
  additionalDetails?: string | null;
}

export interface Experience {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  description?: string | null;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Certification {
  id: string;
  title: string;
  issuer?: string | null;
  skillId?: string | null;
  skillName?: string | null;
  credentialUrl?: string | null;
  fileId?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
}

export interface CandidateProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  currentLocation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  profileImage?: ProfileFile | null;
  resume?: ProfileFile | null;
  coverLetter?: ProfileFile | null;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  certifications: Certification[];
  versionNumber?: number;
  capturedAt?: string;
}

export interface EducationPayload {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  gpa?: number | null;
  additionalDetails?: string | null;
}

export interface ExperiencePayload {
  id?: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  description?: string | null;
}

export interface CertificationPayload {
  id?: string;
  title: string;
  issuer?: string | null;
  skillId?: string | null;
  credentialUrl?: string | null;
  fileId?: string | null;
  /** Display-only fields; stripped before the payload is sent. */
  fileName?: string | null;
  fileUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  currentLocation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  profileImageFileId?: string | null;
  resumeFileId?: string | null;
  coverLetterFileId?: string | null;
  education?: EducationPayload[];
  experience?: ExperiencePayload[];
  skillIds?: string[];
  certifications?: CertificationPayload[];
}

export interface UploadedFile {
  id: string;
  fileType?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
}
