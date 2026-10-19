import type { Request } from 'express';
import type { SessionPayload } from './auth.service';

/** Express request enriched by `SessionAuthGuard`. */
export interface AuthenticatedRequest extends Request {
  session: SessionPayload;
}
