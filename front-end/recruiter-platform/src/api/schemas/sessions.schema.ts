import { z } from 'zod';

export const SessionRowSchema = z.object({
  id: z.string(),
  principalType: z.enum(['candidate', 'user']),
  principalId: z.string(),
  email: z.string(),
  role: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
  lastSeenAt: z.string(),
  expiresAt: z.string(),
  current: z.boolean(),
});

export const SessionListResponseSchema = z.object({
  data: z.array(SessionRowSchema),
});

export type SessionRow = z.infer<typeof SessionRowSchema>;
