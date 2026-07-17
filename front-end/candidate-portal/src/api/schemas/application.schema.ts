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

export const ApplicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  jobTitle: z.string(),
  status: z.nativeEnum(ApplicationStatus),
  appliedAt: z.string(),
  details: z
    .union([InterviewDetailsSchema, OfferDetailsSchema, RejectionDetailsSchema])
    .or(z.record(z.string(), z.unknown()))
    .default({}),
});

export const ApplicationListSchema = z.array(ApplicationSchema);

export const ApplicationActionResponseSchema = z.object({
  success: z.boolean(),
  applicationId: z.string().optional(),
});

// ─── Request Payload Schemas ─────────────────────────────────────────────────

export const OfferResponsePayloadSchema = z.object({
  accept: z.boolean(),
  reason: z.string().optional(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type ApplicationSchema = z.infer<typeof ApplicationSchema>;
