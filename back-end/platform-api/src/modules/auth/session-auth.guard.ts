import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@src/config/configuration';
import { AuthService, type SessionPayload } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

/**
 * Validates the opaque `session_token` cookie against the Redis session store
 * and attaches the session payload to the request.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = this.config.get('cookie', { infer: true }).name;
    const cookies = request.cookies as Record<string, string> | undefined;
    const token = cookies?.[cookieName];

    const session: SessionPayload | null = token
      ? await this.authService.validateSession(token)
      : null;

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    request.session = session;
    return true;
  }
}
