import { z } from 'zod';
import { ApplicationStatus } from '../../types/application.types';

// ─── Sub-schemas for application details ─────────────────────────────────────

const InterviewDetailsSchema = z.object({
  interviewRound: z.string(),
  scheduledAt: z.string(),
  mode: z.string(),
  location: z.string(),
});

const OfferDetailsSchema = z.object({
  offerExtendedAt: z.string(),
  offerDeadline: z.string(),
  offerLink: z.string().optional(),
});

const RejectionDetailsSchema = z.object({
  reason: z.string(),
});

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
  details: z
    .union([InterviewDetailsSchema, OfferDetailsSchema, RejectionDetailsSchema])
    .or(z.record(z.string(), z.unknown()))
    .optional(),
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

export const ApplicationActionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  applicationId: z.string().optional(),
});

// ─── Request Payload Schemas ─────────────────────────────────────────────────

export const OfferResponsePayloadSchema = z.object({
  accept: z.boolean(),
  reason: z.string().optional(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type ApplicationSchema = z.infer<typeof ApplicationSchema>;
export type ApplicationDetailSchema = z.infer<typeof ApplicationDetailSchema>;
