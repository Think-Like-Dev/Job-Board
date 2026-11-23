import { z } from "zod";
import { ApplicationStatus } from "@/types/application.types";
import { CommonServerResponseSchema } from "./common.schema";

/* -------------------------------------------------------------------------- */
/*                              Shared Schemas                                */
/* -------------------------------------------------------------------------- */

export const ApplicationFileSchema = z.object({
  id: z.string(),
  filename: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  url: z.string(),
  downloadUrl: z.string(),
});

export const ApplicationEducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  gpa: z.string().nullable().optional(),
  additionalDetails: z.string().nullable().optional(),
});

export const ApplicationExperienceSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  jobTitle: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable().optional(),
  salary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const ApplicationSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ApplicationCertificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  issuer: z.string().nullable().optional(),
  skillId: z.string().nullable().optional(),
  skillName: z.string().nullable().optional(),
  credentialUrl: z.string().nullable().optional(),
  fileId: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
});

export const ApplicationProfileSnapshotSchema = z.object({
  id: z.string(),
  email: z.string(),
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
  profileImage: ApplicationFileSchema.nullable().optional(),
  resume: ApplicationFileSchema.nullable().optional(),
  coverLetter: ApplicationFileSchema.nullable().optional(),
  education: z.array(ApplicationEducationSchema),
  experience: z.array(ApplicationExperienceSchema),
  skills: z.array(ApplicationSkillSchema),
  certifications: z.array(ApplicationCertificationSchema),
  versionNumber: z.number().optional(),
  capturedAt: z.string().optional(),
});

const RecruiterCandidateSummarySchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string(),
  phone: z.string().optional(),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  profileImageFileId: z.string().optional(),
  resumeFileId: z.string().optional(),
});

const ApplicationStatusHistorySchema = z.object({
  id: z.string(),
  oldStatus: z.enum(ApplicationStatus).nullable().optional(),
  newStatus: z.enum(ApplicationStatus),
  reason: z.string().nullable().optional(),
  changedBy: z.string().nullable().optional(),
  createdAt: z.string(),
});

/* -------------------------------------------------------------------------- */
/*                             Response Schemas                               */
/* -------------------------------------------------------------------------- */

export const JobApplicationListItemSchema = z.object({
  id: z.string(),
  candidateId: z.string(),
  candidateName: z.string(),
  candidateEmail: z.string(),
  candidatePhone: z.string().optional(),
  resumeFileId: z.string(),
  resumeFileName: z.string(),
  status: z.enum(ApplicationStatus),
  appliedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const JobApplicationDetailSchema = JobApplicationListItemSchema.extend({
  profileVersionId: z.string().optional(),
  profile: ApplicationProfileSnapshotSchema,
  resumeFileUrl: z.string(),
  coverLetterFileId: z.string().optional(),
  coverLetterFileName: z.string().optional(),
  coverLetterFileUrl: z.string().optional(),
  withdrawnAt: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  candidate: RecruiterCandidateSummarySchema,
  statusHistory: z.array(ApplicationStatusHistorySchema),
});

export const JobApplicationsListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(JobApplicationListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const JobApplicationDetailResponseSchema = CommonServerResponseSchema(
  JobApplicationDetailSchema,
);

export type JobApplicationsListResponse = z.infer<
  typeof JobApplicationsListResponseSchema
>;
export type JobApplicationDetailResponse = z.infer<
  typeof JobApplicationDetailResponseSchema
>;
