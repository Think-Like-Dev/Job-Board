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
  storage: StorageConfig;
  rabbitmq: RabbitMqConfig;
  mail: MailConfig;
}

/**
 * Outgoing mail. Local development points at Mailpit (SMTP on 1025, UI on
 * 8025); staging and production read a real SMTP relay from the env files.
 */
export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  /** Public base URL of the recruiter SPA, used for links inside emails. */
  appBaseUrl: string;
  /** Link lifetime for a password reset, in minutes. */
  passwordResetExpiryMinutes: number;
}

/** S3-compatible object storage (Garage) used for resumes and cover letters. */
export interface StorageConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
  signedUrlExpirySeconds: number;
}

/**
 * RabbitMQ broker used for the events that cross into the AI service.
 * The topology names live in `src/modules/messaging/messaging.constants.ts`.
 */
export interface RabbitMqConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  vhost: string;
  /** How many unpublished outbox records one relay tick publishes. */
  outboxBatchSize: number;
  /** How often the relay looks for unpublished outbox records, in ms. */
  outboxPollMs: number;
  /** After this many failed publishes the record is marked as permanently failed. */
  maxPublishAttempts: number;
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
  storage: {
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:3900',
    region: process.env.S3_REGION ?? 'garage',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.S3_BUCKET_NAME ?? 'jobboard-files',
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    signedUrlExpirySeconds: parseInt(
      process.env.S3_SIGNED_URL_EXPIRY_SECONDS ?? '900',
      10,
    ),
  },
  rabbitmq: {
    host: process.env.RABBITMQ_HOST ?? 'localhost',
    port: parseInt(process.env.RABBITMQ_PORT ?? '5672', 10),
    user: process.env.RABBITMQ_USER ?? 'guest',
    password: process.env.RABBITMQ_PASSWORD ?? 'guest',
    vhost: process.env.RABBITMQ_VHOST ?? '/',
    outboxBatchSize: parseInt(
      process.env.RABBITMQ_OUTBOX_BATCH_SIZE ?? '50',
      10,
    ),
    outboxPollMs: parseInt(process.env.RABBITMQ_OUTBOX_POLL_MS ?? '5000', 10),
    maxPublishAttempts: parseInt(
      process.env.RABBITMQ_MAX_PUBLISH_ATTEMPTS ?? '5',
      10,
    ),
  },
  mail: {
    // Mailpit's default SMTP port in local development.
    host: process.env.MAIL_HOST ?? 'localhost',
    port: parseInt(process.env.MAIL_PORT ?? '1025', 10),
    secure: (process.env.MAIL_SECURE ?? 'false') === 'true',
    user: process.env.MAIL_USER || undefined,
    password: process.env.MAIL_PASSWORD || undefined,
    from: process.env.MAIL_FROM ?? 'no-reply@jobboard.local',
    appBaseUrl: process.env.RECRUITER_APP_URL ?? 'http://localhost:5173',
    passwordResetExpiryMinutes: parseInt(
      process.env.PASSWORD_RESET_EXPIRY_MINUTES ?? '30',
      10,
    ),
  },
});
