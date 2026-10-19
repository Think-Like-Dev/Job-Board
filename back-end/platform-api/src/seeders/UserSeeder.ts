import { Seeder } from '@mikro-orm/seeder';
import type { EntityManager } from '@mikro-orm/postgresql';
import * as argon2 from 'argon2';
import { UserRole } from '../common/constants/enums';
import { UserSchema } from '../modules/users/user.schema';

interface SeedUser {
  name: string;
  email: string;
  role: UserRole;
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'System Admin',
    email: 'admin@jobboard.local',
    role: UserRole.ADMIN,
  },
  {
    name: 'Recruiter',
    email: 'recruiter@jobboard.local',
    role: UserRole.RECRUITER,
  },
  {
    name: 'Hiring Manager',
    email: 'hiring.manager@jobboard.local',
    role: UserRole.HIRING_MANAGER,
  },
];

const LOCAL_SEED_PASSWORD = 'ChangeMe123!';

function resolveSeedPassword(): string {
  const configured = process.env.SEED_DEFAULT_PASSWORD?.trim();
  if (configured) {
    return configured;
  }

  if ((process.env.NODE_ENV ?? 'local') === 'local') {
    return LOCAL_SEED_PASSWORD;
  }

  throw new Error(
    'SEED_DEFAULT_PASSWORD is required to seed users outside local development',
  );
}

/** Creates the initial internal users. Existing emails are left untouched. */
export class UserSeeder extends Seeder {
  override async run(em: EntityManager): Promise<void> {
    const passwordHash = await argon2.hash(resolveSeedPassword());
    let created = 0;
    let skipped = 0;

    for (const seedUser of SEED_USERS) {
      const existing = await em.findOne(UserSchema, { email: seedUser.email });
      if (existing) {
        skipped++;
        continue;
      }

      const user = em.create(UserSchema, {
        ...seedUser,
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      em.persist(user);
      created++;
    }

    await em.flush();
    console.log(`[seed] users: ${created} created, ${skipped} skipped`);
  }
}
