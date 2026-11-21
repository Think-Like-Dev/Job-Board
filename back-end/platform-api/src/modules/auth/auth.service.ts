import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import * as crypto from 'node:crypto';
import { AuthRole } from '@common/constants/enums';
import { RedisService } from '@common/redis/redis.service';
import type {
  AppConfig,
  CookieConfig,
  MailConfig,
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
  /** Internal session id — safe to show in the UI, never the token itself. */
  sid: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip?: string;
  userAgent?: string;
}

/** The caller-supplied part of a new session. */
export type NewSessionPayload = Omit<
  SessionPayload,
  'sid' | 'createdAt' | 'lastSeenAt' | 'expiresAt'
>;

/** Request metadata captured when a session is created. */
export interface SessionMetadata {
  ip?: string;
  userAgent?: string;
}

/** Frontend-facing session row (no token, ever). */
export interface SessionView {
  id: string;
  principalType: 'candidate' | 'user';
  principalId: string;
  email: string;
  role: string;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

interface IndexedSession {
  token: string;
  payload: SessionPayload;
}

/** Value stored in Redis for a pending OTP challenge. */
interface OtpRecord {
  otp: string;
  role: AuthRole;
}

const OTP_PREFIX = 'otp:';
const SESSION_PREFIX = 'session:';
const PASSWORD_RESET_PREFIX = 'password-reset:';
/** Per-principal sorted set (score = expiry) of live session tokens. */
const SESSION_INDEX_PREFIX = 'sessions:';
/** Global index so an admin can list every live session without a target. */
const SESSION_INDEX_ALL = 'sessions:all';
/** `lastSeenAt` is written at most this often per session. */
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

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
  private readonly mailConfig: MailConfig;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly redis: RedisService,
  ) {
    this.otpConfig = config.get('otp', { infer: true });
    this.sessionConfig = config.get('session', { infer: true });
    this.cookieConfig = config.get('cookie', { infer: true });
    this.mailConfig = config.get('mail', { infer: true });
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
  async createSession(
    res: Response,
    payload: NewSessionPayload,
    meta: SessionMetadata = {},
  ): Promise<string> {
    const token = crypto
      .randomBytes(Math.ceil(this.sessionConfig.tokenLength / 2))
      .toString('hex')
      .slice(0, this.sessionConfig.tokenLength);

    const ttlSeconds = this.sessionConfig.expiresInMinutes * 60;
    const now = new Date();
    const record: SessionPayload = {
      ...payload,
      sid: crypto.randomUUID(),
      createdAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
      ip: meta.ip,
      userAgent: meta.userAgent,
    };

    await this.redis.client.set(
      SESSION_PREFIX + token,
      JSON.stringify(record),
      'EX',
      ttlSeconds,
    );
    await this.indexSession(record, token);

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
    const payload = await this.readSession(token);
    if (!payload) return null;

    // Throttled: at most one write per session every five minutes.
    const lastSeen = Date.parse(payload.lastSeenAt ?? '');
    if (
      !Number.isFinite(lastSeen) ||
      Date.now() - lastSeen > LAST_SEEN_THROTTLE_MS
    ) {
      payload.lastSeenAt = new Date().toISOString();
      await this.redis.client.set(
        SESSION_PREFIX + token,
        JSON.stringify(payload),
        'KEEPTTL',
      );
    }

    return payload;
  }

  /** Destroys a session in Redis (and its index entries) and clears the cookie. */
  async destroySession(res: Response, token?: string): Promise<void> {
    if (token) {
      const payload = await this.readSession(token);
      await this.redis.client.del(SESSION_PREFIX + token);
      if (payload) {
        await this.unindexSession(payload, token);
      }
    }
    res.clearCookie(this.cookieConfig.name, {
      httpOnly: true,
      path: this.cookieConfig.path,
    });
  }

  // ─── Session listing and revocation ────────────────────────────────────────

  /** Live sessions of one principal, newest activity first. */
  async listSessions(current: SessionPayload): Promise<SessionView[]> {
    const entries = await this.readIndex(this.principalIndexKey(current));
    return this.toViews(entries, current.sid);
  }

  /** Live sessions of any principal, for the admin screens. */
  async listSessionsFor(
    principalType: 'candidate' | 'user',
    principalId: string,
  ): Promise<SessionView[]> {
    const entries = await this.readIndex(
      `${SESSION_INDEX_PREFIX}${principalType}:${principalId}`,
    );
    return this.toViews(entries);
  }

  /** Every live session on the deployment (admin only). */
  async listAllSessions(): Promise<SessionView[]> {
    return this.toViews(await this.readIndex(SESSION_INDEX_ALL));
  }

  /** Revokes one session of a principal by its public id (`sid`). */
  async revokeSession(
    principalType: 'candidate' | 'user',
    principalId: string,
    sid: string,
  ): Promise<boolean> {
    return this.revokeFromIndex(
      `${SESSION_INDEX_PREFIX}${principalType}:${principalId}`,
      sid,
    );
  }

  /** Revokes every session of a principal except the current one. */
  async revokeOtherSessions(current: SessionPayload): Promise<number> {
    const entries = await this.readIndex(this.principalIndexKey(current));
    let removed = 0;

    for (const entry of entries) {
      if (entry.payload.sid === current.sid) continue;
      await this.redis.client.del(SESSION_PREFIX + entry.token);
      await this.unindexSession(entry.payload, entry.token);
      removed += 1;
    }

    return removed;
  }

  // ─── Password reset (Redis) ────────────────────────────────────────────────

  /**
   * Issues a single-use reset token. Only its SHA-256 hash is stored, so a
   * dumped Redis value cannot be replayed.
   */
  async createPasswordResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const ttlSeconds = this.mailConfig.passwordResetExpiryMinutes * 60;
    await this.redis.client.set(
      PASSWORD_RESET_PREFIX + sha256(token),
      normalize(email),
      'EX',
      ttlSeconds,
    );
    return token;
  }

  /** Consumes a reset token, returning the email it was issued for. */
  async consumePasswordResetToken(token: string): Promise<string | null> {
    if (!token) return null;
    const key = PASSWORD_RESET_PREFIX + sha256(token);
    const email = await this.redis.client.get(key);
    if (!email) return null;
    await this.redis.client.del(key);
    return email;
  }

  /**
   * Deletes every session belonging to an email address.
   *
   * Password reset must not leave old sessions alive. The global index makes
   * this a single pass over live sessions instead of a key scan.
   */
  async revokeSessionsForEmail(email: string): Promise<number> {
    const target = normalize(email);
    const entries = await this.readIndex(SESSION_INDEX_ALL);
    let removed = 0;

    for (const entry of entries) {
      if (normalize(entry.payload.email) !== target) continue;
      await this.redis.client.del(SESSION_PREFIX + entry.token);
      await this.unindexSession(entry.payload, entry.token);
      removed += 1;
    }

    return removed;
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async readSession(token?: string): Promise<SessionPayload | null> {
    if (!token) return null;
    const raw = await this.redis.client.get(SESSION_PREFIX + token);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      return null;
    }
  }

  private principalIndexKey(
    principal: Pick<SessionPayload, 'principalType' | 'principalId'>,
  ): string {
    return `${SESSION_INDEX_PREFIX}${principal.principalType}:${principal.principalId}`;
  }

  private async indexSession(
    payload: SessionPayload,
    token: string,
  ): Promise<void> {
    const score = Date.parse(payload.expiresAt);
    await this.redis.client.zadd(this.principalIndexKey(payload), score, token);
    await this.redis.client.zadd(SESSION_INDEX_ALL, score, token);
  }

  private async unindexSession(
    payload: SessionPayload,
    token: string,
  ): Promise<void> {
    await this.redis.client.zrem(this.principalIndexKey(payload), token);
    await this.redis.client.zrem(SESSION_INDEX_ALL, token);
  }

  /**
   * Reads a sorted-set index, pruning expired members and dangling tokens.
   * Tokens stay internal: callers receive `SessionView` rows keyed by `sid`.
   */
  private async readIndex(indexKey: string): Promise<IndexedSession[]> {
    await this.redis.client.zremrangebyscore(indexKey, '-inf', Date.now());
    const tokens = await this.redis.client.zrange(indexKey, '0', '-1');
    if (!tokens.length) return [];

    const raw = await this.redis.client.mget(
      ...tokens.map((token) => SESSION_PREFIX + token),
    );
    const entries: IndexedSession[] = [];

    for (let index = 0; index < raw.length; index += 1) {
      const value = raw[index];
      if (!value) {
        await this.redis.client.zrem(indexKey, tokens[index]);
        continue;
      }
      try {
        entries.push({
          token: tokens[index],
          payload: JSON.parse(value) as SessionPayload,
        });
      } catch {
        await this.redis.client.zrem(indexKey, tokens[index]);
      }
    }

    return entries;
  }

  private async revokeFromIndex(
    indexKey: string,
    sid: string,
  ): Promise<boolean> {
    const entries = await this.readIndex(indexKey);
    const target = entries.find(
      (entry) => (entry.payload.sid ?? entry.token.slice(0, 8)) === sid,
    );
    if (!target) return false;

    await this.redis.client.del(SESSION_PREFIX + target.token);
    await this.unindexSession(target.payload, target.token);
    return true;
  }

  private toViews(
    entries: IndexedSession[],
    currentSid?: string,
  ): SessionView[] {
    return entries
      .map(({ token, payload }) => ({
        id: payload.sid ?? token.slice(0, 8),
        principalType: payload.principalType,
        principalId: payload.principalId,
        email: payload.email,
        role: payload.role,
        ip: payload.ip,
        userAgent: payload.userAgent,
        createdAt: payload.createdAt ?? '',
        lastSeenAt: payload.lastSeenAt ?? '',
        expiresAt: payload.expiresAt ?? '',
        current: Boolean(currentSid && payload.sid === currentSid),
      }))
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private randomOtp(): string {
    return String(crypto.randomInt(100000, 1000000));
  }
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
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
