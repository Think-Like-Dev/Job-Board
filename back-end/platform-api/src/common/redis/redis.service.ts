import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AppConfig } from '@src/config/configuration';

/**
 * Shared Redis client used for the OTP store and the central session store.
 * Redis (key/value with TTL) is the source of truth for short-lived auth
 * state — nothing sensitive is persisted to Postgres.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(config: ConfigService<AppConfig, true>) {
    const redis = config.get('redis', { infer: true });
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      keyPrefix: redis.keyPrefix,
      lazyConnect: true,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.log('Redis connected');
    } catch (err) {
      this.logger.warn(`Redis unavailable: ${(err as Error).message}`);
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
