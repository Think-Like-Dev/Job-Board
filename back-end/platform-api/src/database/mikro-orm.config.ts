import { defineConfig, type Options } from '@mikro-orm/postgresql';
import type { DatabaseConfig } from '@src/config/configuration';

/**
 * Builds the MikroORM Postgres options from the centralised app config.
 * Entities are defined with the v7 `EntitySchema` API and live in
 * `*.schema.ts` files, discovered via glob paths (works outside webpack).
 *
 * The MikroORM CLI sets `MIKRO_ORM_CLI_ALWAYS_ALLOW_TS=1`, which makes
 * `Utils.detectTypeScriptSupport()` return true even for the compiled CLI
 * config. That flips `preferTs` on, so MikroORM resolves `entitiesTs`/`pathTs`
 * (`src/...`) instead of `entities`/`path` (`dist/...`). The production image
 * only contains `dist`, which produced "No entities were discovered". Detect
 * the compiled runtime from the module filename and pin `preferTs` accordingly.
 */
const isCompiledRuntime = __filename.endsWith('.js');

export function buildMikroOrmOptions(
  db: DatabaseConfig,
  nodeEnv: string,
): Options {
  return defineConfig({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    dbName: db.dbName,
    debug: nodeEnv !== 'production',
    preferTs: !isCompiledRuntime,
    entities: ['dist/src/modules/**/*.schema.js'],
    entitiesTs: ['src/modules/**/*.schema.ts'],
    migrations: {
      path: 'dist/src/migrations',
      pathTs: 'src/migrations',
      glob: '!(*.d).{js,ts}',
      disableForeignKeys: false,
      transactional: true,
      allOrNothing: true,
      emit: 'ts',
      // Snapshots are optional and are named per database. This project treats
      // the migration files plus live DB introspection as the source of truth.
      snapshot: false,
    },
    seeder: {
      path: 'dist/src/seeders',
      pathTs: 'src/seeders',
      glob: '!(*.d).{js,ts}',
      defaultSeeder: 'DatabaseSeeder',
      emit: 'ts',
    },
  });
}
