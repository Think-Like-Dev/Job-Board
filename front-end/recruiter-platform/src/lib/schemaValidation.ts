import { z } from 'zod';

/**
 * Thrown when a Zod schema parse fails on an API response.
 * Centralises the error shape so callers can distinguish validation
 * failures from network / server errors.
 */
export class SchemaValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(issues: z.core.$ZodIssue[], context?: string) {
    const summary = issues.map((i) => `[${i.path.join('.')}] ${i.message}`).join('; ');
    super(context ? `Schema validation failed (${context}): ${summary}` : `Schema validation failed: ${summary}`);
    this.name = 'SchemaValidationError';
    this.issues = issues;
  }
}

/**
 * Parse a Zod schema safely and throw a typed SchemaValidationError on failure.
 * Always prefer this over calling schema.parse() directly so errors are consistent.
 */
export function parseSchema<T>(schema: z.ZodType<T>, data: unknown, context?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new SchemaValidationError(result.error.issues, context);
  }
  return result.data;
}
