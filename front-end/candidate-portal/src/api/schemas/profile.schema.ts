import { z } from 'zod';

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const EducationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  grade: z.string().optional(),
  gpa: z.string().optional(),
  additionalDetails: z.string().optional(),
});

const ExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  salary: z.string().optional(),
  additionalDetails: z.string().optional(),
});

// ─── Response Schemas ────────────────────────────────────────────────────────

export const CandidateProfileSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  avatarUrl: z.string().optional(),
  resumeUrl: z.string().optional(),
  education: z.array(EducationSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  skills: z.array(z.string()).optional(),
  portfolioUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

export const UploadResponseSchema = z.object({
  url: z.string(),
  filename: z.string(),
});

// ─── Request Payload Schemas ─────────────────────────────────────────────────

export const UpdateProfilePayloadSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  education: z.array(EducationSchema).optional(),
  experience: z.array(ExperienceSchema).optional(),
  skills: z.array(z.string()).optional(),
  portfolioUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type CandidateProfileSchema = z.infer<typeof CandidateProfileSchema>;
export type UpdateProfilePayloadSchema = z.infer<typeof UpdateProfilePayloadSchema>;
