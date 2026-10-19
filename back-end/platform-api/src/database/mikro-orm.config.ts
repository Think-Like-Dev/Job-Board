import { defineConfig, type Options } from '@mikro-orm/postgresql';
import type { DatabaseConfig } from '@src/config/configuration';

/**
 * Builds the MikroORM Postgres options from the centralised app config.
 * Entities are defined with the v7 `EntitySchema` API and live in
 * `*.schema.ts` files, discovered via glob paths (works outside webpack).
 */
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
    entities: ['dist/**/*.schema.js'],
    entitiesTs: ['src/**/*.schema.ts'],
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
