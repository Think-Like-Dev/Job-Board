import { z } from 'zod';

// ─── Response Schemas ────────────────────────────────────────────────────────

export const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  location: z.string(),
  experience: z.string(),
  salaryRange: z.string(),
  description: z.string(),
  isBookmarked: z.boolean(),
  postedAt: z.string(),
});

export const JobListSchema = z.array(JobSchema);

export const BookmarkResponseSchema = z.object({
  success: z.boolean(),
  isBookmarked: z.boolean(),
});

// ─── Request Payload Schemas ─────────────────────────────────────────────────

export const JobFiltersSchema = z.object({
  search: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  experience: z.string().optional(),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type JobSchema = z.infer<typeof JobSchema>;
export type JobFiltersSchema = z.infer<typeof JobFiltersSchema>;
