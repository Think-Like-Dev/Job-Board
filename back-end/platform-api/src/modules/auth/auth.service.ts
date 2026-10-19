import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as crypto from 'node:crypto';
import { AuthRole } from '@common/constants/enums';
import { RedisService } from '@common/redis/redis.service';
import type {
  AppConfig,
  CookieConfig,
  OtpConfig,
  SessionConfig,
} from '@src/config/configuration';

/** Principal bound to a session (a candidate or an internal user). */
export interface SessionPayload {
  principalType: 'candidate' | 'user';
  principalId: string;
  email: string;
  /** Raw role value (an AuthRole for candidates, a UserRole for users). */
  role: string;
}

/** Value stored in Redis for a pending OTP challenge. */
interface OtpRecord {
  otp: string;
  role: AuthRole;
}

const OTP_PREFIX = 'otp:';
const SESSION_PREFIX = 'session:';

/**
 * Auth state lives entirely in Redis (the central source of truth):
 *  - OTPs are short-lived keys with TTL
 *  - login sessions are keys holding a JSON payload, expiring after the
 *    configured session lifetime. No session rows are persisted to Postgres.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpConfig: OtpConfig;
  private readonly sessionConfig: SessionConfig;
  private readonly cookieConfig: CookieConfig;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {
    this.otpConfig = config.get('otp', { infer: true });
    this.sessionConfig = config.get('session', { infer: true });
    this.cookieConfig = config.get('cookie', { infer: true });
  }

  // ─── OTP (Redis) ───────────────────────────────────────────────────────────

  async generateOtp(
    email: string,
    role: AuthRole = AuthRole.CANDIDATE,
  ): Promise<string> {
    const otp = this.otpConfig.devFixedOtp || this.randomOtp();
    const record: OtpRecord = { otp, role };
    await this.redis.client.set(
      OTP_PREFIX + normalize(email),
      JSON.stringify(record),
      'EX',
      this.otpConfig.expirySeconds,
    );
    return otp;
  }

  /**
   * Validates an OTP and consumes it. Returns the role the challenge was
   * created for, or `null` when the code is missing, expired, or incorrect.
   */
  async verifyOtp(email: string, submitted: string): Promise<AuthRole | null> {
    const key = OTP_PREFIX + normalize(email);
    const raw = await this.redis.client.get(key);
    if (!raw) {
      return null;
    }

    const record = parseOtpRecord(raw);
    if (!record || record.otp !== submitted) {
      return null;
    }

    await this.redis.client.del(key);
    return record.role;
  }

  // ─── Sessions (Redis = source of truth) ────────────────────────────────────

  /**
   * Creates a session in Redis, sets the HttpOnly cookie, and returns the
   * session token. The token is the only thing the client holds (in a cookie);
   * the authoritative record lives in Redis keyed by that token.
   */
  async createSession(res: Response, payload: SessionPayload): Promise<string> {
    const token = crypto
      .randomBytes(Math.ceil(this.sessionConfig.tokenLength / 2))
      .toString('hex')
      .slice(0, this.sessionConfig.tokenLength);

    const ttlSeconds = this.sessionConfig.expiresInMinutes * 60;
    await this.redis.client.set(
      SESSION_PREFIX + token,
      JSON.stringify(payload),
      'EX',
      ttlSeconds,
    );

    const cookie = this.cookieConfig;
    res.cookie(cookie.name, token, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAgeMs,
    });
    return token;
  }

  /** Loads the session payload for a token, or null when missing/expired. */
  async validateSession(token: string): Promise<SessionPayload | null> {
    if (!token) return null;
    const raw = await this.redis.client.get(SESSION_PREFIX + token);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      return null;
    }
  }

  /** Destroys a session in Redis and clears the cookie. */
  async destroySession(res: Response, token?: string): Promise<void> {
    if (token) {
      await this.redis.client.del(SESSION_PREFIX + token);
    }
    res.clearCookie(this.cookieConfig.name, {
      httpOnly: true,
      path: this.cookieConfig.path,
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private randomOtp(): string {
    return String(crypto.randomInt(100000, 1000000));
  }
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function parseOtpRecord(raw: string): OtpRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<OtpRecord>;
    if (typeof parsed.otp !== 'string') return null;
    return {
      otp: parsed.otp,
      role: parsed.role ?? AuthRole.CANDIDATE,
    };
  } catch {
    // Backwards compatibility with OTPs stored as a plain string.
    return { otp: raw, role: AuthRole.CANDIDATE };
  }
}
