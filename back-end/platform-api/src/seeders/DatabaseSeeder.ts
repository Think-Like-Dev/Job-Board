import { Seeder } from '@mikro-orm/seeder';
import type { EntityManager } from '@mikro-orm/postgresql';
import { UserSeeder } from './UserSeeder';

/** Default seeder invoked by `pnpm seed:run`. */
export class DatabaseSeeder extends Seeder {
  override async run(em: EntityManager): Promise<void> {
    await this.call(em, [UserSeeder]);
  }
}
