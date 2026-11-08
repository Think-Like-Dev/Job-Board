import { z } from 'zod';
import {
  CompensationType,
  EmploymentType,
  JobStatus,
  WorkMode,
} from '@/types/job.types';

// ─── Shared schemas ─────────────────────────────────────────────────────────

const CompensationSchema = z
  .object({
    type: z.enum(CompensationType),
    currency: z.string().optional(),
    period: z.string().optional(),
    amount: z.union([z.number(), z.array(z.number())]).optional(),
  })
  .nullable();

const ApplicationSettingsSchema = z.object({
  coverLetterRequired: z.boolean(),
  attachmentsAllowed: z.boolean(),
  maximumAttachments: z.number(),
});

// ─── Response schemas ───────────────────────────────────────────────────────

export const JobSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  category: z.string(),
  description: z.string(),
  location: z.string(),
  employmentType: z.enum(EmploymentType),
  department: z.string().nullish(),
  designation: z.string().nullish(),
  compensation: CompensationSchema.optional(),
  keywords: z.array(z.string()),
  benefits: z.array(z.string()).nullish(),
  totalInterviewRounds: z.number().nullish(),
  yearsOfExperience: z.string().nullish(),
  lastApplicationDate: z.string().nullish(),
  status: z.enum(JobStatus),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
  publishedAt: z.string().nullish(),
});

export const JobDetailSchema = JobSummarySchema.extend({
  responsibilities: z.string(),
  yearsOfExperience: z.string(),
  vacancies: z.number(),
  workMode: z.array(z.enum(WorkMode)),
  workShiftTiming: z.array(z.string()),
  skills: z.array(z.string()),
  applicationSettings: ApplicationSettingsSchema.optional(),
  hiringProcess: z.array(z.string()).optional(),
});

export const JobPaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
});

export const JobListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(JobSummarySchema),
  pagination: JobPaginationSchema,
});

export const JobDetailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: JobDetailSchema,
});

export const BookmarkListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(JobSummarySchema),
});

export const BookmarkResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    jobId: z.string(),
    isBookmarked: z.boolean(),
  }),
});

// ─── Request payload schemas ────────────────────────────────────────────────

export const JobFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  currency: z.string().optional(),
  compensationMin: z.number().nonnegative().optional(),
  compensationMax: z.number().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  orderBy: z.string().optional(),
  orderByDirection: z.enum(['ASC', 'DESC']).optional(),
});

// ─── Inferred types ─────────────────────────────────────────────────────────

export type JobSummarySchema = z.infer<typeof JobSummarySchema>;
export type JobDetailSchema = z.infer<typeof JobDetailSchema>;
export type JobListResponseSchema = z.infer<typeof JobListResponseSchema>;
export type JobDetailResponseSchema = z.infer<typeof JobDetailResponseSchema>;
export type JobFiltersSchema = z.infer<typeof JobFiltersSchema>;
