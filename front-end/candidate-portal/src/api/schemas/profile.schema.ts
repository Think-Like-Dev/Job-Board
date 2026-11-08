import { z } from 'zod';

// ─── Response schemas ────────────────────────────────────────────────────────

export const ProfileFileSchema = z.object({
  id: z.uuid(),
  filename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  url: z.string(),
  downloadUrl: z.string(),
});

export const EducationSchema = z.object({
  id: z.uuid(),
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  gpa: z.string().nullable().optional(),
  additionalDetails: z.string().nullable().optional(),
});

export const ExperienceSchema = z.object({
  id: z.uuid(),
  companyName: z.string(),
  jobTitle: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const SkillSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const CertificationSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  issuer: z.string().nullable().optional(),
  skillId: z.uuid().nullable().optional(),
  skillName: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
  fileId: z.uuid().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
});

export const CandidateProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  currentLocation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  portfolioUrl: z.string().nullable().optional(),
  profileImage: ProfileFileSchema.nullable().optional(),
  resume: ProfileFileSchema.nullable().optional(),
  coverLetter: ProfileFileSchema.nullable().optional(),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  versionNumber: z.number().optional(),
  capturedAt: z.string().optional(),
});

export const ProfileResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: CandidateProfileSchema,
});

export const UploadedFileSchema = z.object({
  id: z.uuid(),
  fileType: z.string().optional(),
  filename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  createdAt: z.string(),
});

export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: UploadedFileSchema,
});

export const SkillListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(SkillSchema),
});

export const SkillResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: SkillSchema,
});

// ─── Request schemas ────────────────────────────────────────────────────────

/**
 * Empty strings come from cleared `<input type="date">` / URL fields. They are
 * accepted by the form schema and converted to `null` by `toUpdatePayload`
 * before the request, so the API never receives an invalid empty date/URL.
 */
const optionalUrl = z.union([z.url(), z.literal(''), z.null()]).optional();
const optionalDate = z.string().nullable().optional();

export const EducationPayloadSchema = z.object({
  id: z.uuid().optional(),
  institution: z.string().trim().min(1, 'Institution is required'),
  degree: z.string().trim().min(1, 'Degree is required'),
  fieldOfStudy: z.string().trim().min(1, 'Field of study is required'),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: optionalDate,
  grade: z.string().nullable().optional(),
  gpa: z.number().min(0).max(10).nullable().optional(),
  additionalDetails: z.string().nullable().optional(),
});

export const ExperiencePayloadSchema = z.object({
  id: z.uuid().optional(),
  companyName: z.string().trim().min(1, 'Company is required'),
  jobTitle: z.string().trim().min(1, 'Job title is required'),
  startDate: z.string().trim().min(1, 'Start date is required'),
  endDate: optionalDate,
  salary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const CertificationPayloadSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, 'Title is required'),
    issuer: z.string().nullable().optional(),
    skillId: z.uuid().nullable().optional(),
    credentialUrl: optionalUrl,
    fileId: z.uuid().nullable().optional(),
    issueDate: optionalDate,
    expiryDate: optionalDate,
  })
  .refine((value) => Boolean(value.credentialUrl || value.fileId), {
    message: 'Add a credential URL or upload a soft copy',
    path: ['credentialUrl'],
  });

export const UpdateProfilePayloadSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  currentLocation: z.string().max(150).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  profileImageFileId: z.uuid().nullable().optional(),
  resumeFileId: z.uuid().nullable().optional(),
  coverLetterFileId: z.uuid().nullable().optional(),
  education: z.array(EducationPayloadSchema).optional(),
  experience: z.array(ExperiencePayloadSchema).optional(),
  skillIds: z.array(z.uuid()).optional(),
  certifications: z.array(CertificationPayloadSchema).optional(),
});

/** Form schema: arrays are always present so react-hook-form can manage them. */
export const ProfileFormSchema = UpdateProfilePayloadSchema.extend({
  education: z.array(EducationPayloadSchema),
  experience: z.array(ExperiencePayloadSchema),
  certifications: z.array(CertificationPayloadSchema),
  skillIds: z.array(z.uuid()),
});

export type CandidateProfileSchema = z.infer<typeof CandidateProfileSchema>;
export type UpdateProfilePayloadSchema = z.infer<
  typeof UpdateProfilePayloadSchema
>;
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
