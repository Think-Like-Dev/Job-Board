import { EntitySchema } from '@mikro-orm/core';

/**
 * Canonical skill taxonomy shared by candidates, certifications, and future
 * job matching. `normalizedName` is the deduplication key; `name` is the
 * display spelling of the first record that created it.
 */
export interface Skill {
  id: string;
  name: string;
  normalizedName: string;
  createdAt?: Date;
}

export const SkillSchema = new EntitySchema<Skill>({
  name: 'Skill',
  tableName: 'skills',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    name: { type: 'string', unique: true },
    normalizedName: { type: 'string', unique: true },
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
  },
});
