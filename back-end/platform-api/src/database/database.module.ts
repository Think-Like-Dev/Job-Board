import {
  Module,
  OnApplicationShutdown,
  OnModuleInit,
  ShutdownSignal,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { buildMikroOrmOptions } from './mikro-orm.config';
import type { AppConfig } from '@src/config/configuration';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      inject: [ConfigService],
      driver: PostgreSqlDriver,
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const db = config.get('database', { infer: true });
        const nodeEnv = config.get('nodeEnv', { infer: true });
        return buildMikroOrmOptions(db, nodeEnv);
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    // Connect eagerly so the service fails fast when the DB is unreachable.
    await this.orm.connect();
  }

  async onApplicationShutdown(signal: ShutdownSignal): Promise<void> {
    if (signal === ShutdownSignal.SIGINT) {
      console.log(`[Database] Shutdown signal received: ${signal}`);
      try {
        if (await this.orm.isConnected()) {
          // Force close existing open connections gracefully
          await this.orm.close(true);
          console.log('[Database] MikroORM connection closed safely.');
        }
      } catch (error) {
        console.error(
          '[Database] Error while terminating database connection:',
          error,
        );
      }
    }
  }
}
