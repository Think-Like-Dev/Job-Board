/** Shared profile view model used by live reads and JSONB snapshots. */

export interface FileView {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  url: string;
  downloadUrl: string;
}

export interface EducationView {
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

export interface ExperienceView {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  description?: string | null;
}

export interface SkillView {
  id: string;
  name: string;
}

export interface CertificationView {
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

export interface ProfileView {
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
  profileImage?: FileView | null;
  resume?: FileView | null;
  coverLetter?: FileView | null;
  education: EducationView[];
  experience: ExperienceView[];
  skills: SkillView[];
  certifications: CertificationView[];
  /** Present only when the view came from an immutable snapshot. */
  versionNumber?: number;
  capturedAt?: string;
}

/** JSONB shape stored in `candidate_profile_versions.profile_data`. */
export interface ProfileSnapshotData extends ProfileView {
  schemaVersion: 1;
  documentFileIds: string[];
}
