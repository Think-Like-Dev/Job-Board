import { existsSync } from 'node:fs';
import { buildMikroOrmOptions } from './mikro-orm.config';
import type { DatabaseConfig } from '../config/configuration';

/**
 * MikroORM CLI configuration.
 *
 * The Nest app loads env files through `ConfigModule`, but the CLI runs outside
 * Nest, so this file mirrors the same loading order (`NODE_ENV` file first,
 * then `.env`) and falls back to the same defaults as `configuration.ts`.
 */
const nodeEnv = process.env.NODE_ENV ?? 'local';

for (const file of [`.env.${nodeEnv}`, '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file);
  }
}

const database: DatabaseConfig = {
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  user: process.env.DATABASE_USER ?? 'thinklikedev',
  password: process.env.DATABASE_PASSWORD ?? '',
  dbName: process.env.DATABASE_NAME ?? 'job_board',
};

export default buildMikroOrmOptions(database, nodeEnv);
