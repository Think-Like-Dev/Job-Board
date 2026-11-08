import { z } from 'zod';
import { ApplicationStatus } from '../../types/application.types';

// ─── Response Schemas ────────────────────────────────────────────────────────

export const ApplicationStatusHistorySchema = z.object({
  id: z.uuid(),
  oldStatus: z.nativeEnum(ApplicationStatus).nullable().optional(),
  newStatus: z.nativeEnum(ApplicationStatus),
  reason: z.string().nullable().optional(),
  changedBy: z.uuid().nullable().optional(),
  createdAt: z.string(),
});

export const ApplicationSchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  jobTitle: z.string(),
  jobCategory: z.string(),
  jobLocation: z.string(),
  status: z.nativeEnum(ApplicationStatus),
  appliedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  withdrawnAt: z.string().nullable().optional(),
  resumeFileId: z.uuid(),
  resumeFileName: z.string(),
  resumeFileUrl: z.string(),
  coverLetterFileId: z.uuid().optional(),
  coverLetterFileName: z.string().optional(),
  coverLetterFileUrl: z.string().optional(),
});

export const ApplicationDetailSchema = ApplicationSchema.extend({
  updatedAt: z.string().optional(),
  statusHistory: z.array(ApplicationStatusHistorySchema),
});

export const ApplicationListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.array(ApplicationSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const ApplicationDetailResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: ApplicationDetailSchema,
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type ApplicationSchema = z.infer<typeof ApplicationSchema>;
export type ApplicationDetailSchema = z.infer<typeof ApplicationDetailSchema>;
