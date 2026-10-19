// ─── Application configuration loader ─────────────────────────────────────────
// Centralised, validated environment variables using @nestjs/config.

export interface AppConfig {
  port: number;
  apiPrefix: string;
  nodeEnv: string;
  database: DatabaseConfig;
  redis: RedisConfig;
  session: SessionConfig;
  otp: OtpConfig;
  cookie: CookieConfig;
  corsOrigins: string[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  dbName: string;
}

/** Redis connection used as the central auth store (OTP + login sessions). */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  /** Namespace prefix applied to all keys, e.g. `jobboard:`. */
  keyPrefix: string;
}

export interface SessionConfig {
  tokenLength: number;
  expiresInMinutes: number;
}

export interface OtpConfig {
  expirySeconds: number;
  /** In dev, the generated OTP is always 123456 so the UI can be tested without an email server. */
  devFixedOtp: string | undefined;
}

export interface CookieConfig {
  name: string;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  httpOnly: boolean;
  path: string;
  maxAgeMs: number;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'local',
  port: parseInt(process.env.PORT ?? '5000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER ?? 'thinklikedev',
    password: process.env.DATABASE_PASSWORD ?? '',
    dbName: process.env.DATABASE_NAME ?? 'job_board',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'jobboard:',
  },
  session: {
    tokenLength: 32,
    expiresInMinutes: parseInt(
      process.env.SESSION_EXPIRY_MINUTES ?? '10080',
      10,
    ), // 7 days
  },
  otp: {
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS ?? '300', 10), // 5 min
    // Fixed OTP for local development only; staging/production use real OTPs.
    devFixedOtp:
      (process.env.NODE_ENV ?? 'local') === 'local'
        ? process.env.DEV_FIXED_OTP || '123456'
        : undefined,
  },
  cookie: {
    name: process.env.SESSION_COOKIE_NAME ?? 'session_token',
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite:
      (process.env.COOKIE_SAME_SITE as 'lax' | 'strict' | 'none') ?? 'lax',
    httpOnly: true,
    path: '/',
    maxAgeMs:
      parseInt(process.env.SESSION_EXPIRY_MINUTES ?? '10080', 10) * 60 * 1000,
  },
  corsOrigins: (
    process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174'
  )
    .split(',')
    .map((origin) => origin.trim()),
});
