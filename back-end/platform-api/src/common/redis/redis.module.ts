import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global module exposing the shared Redis client. Used by the OTP store and
 * the central session store (Redis is the source of truth for auth state).
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
