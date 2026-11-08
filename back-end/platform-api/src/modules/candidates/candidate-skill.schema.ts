import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { SkillSchema } from '@modules/skills/skill.schema';
import { CandidateSchema } from './candidate.schema';

/** Live many-to-many link between a candidate and a canonical skill. */
export interface CandidateSkill {
  candidateId: string;
  skillId: string;
  createdAt?: Date;
}

export const CandidateSkillSchema = new EntitySchema<CandidateSkill>({
  name: 'CandidateSkill',
  tableName: 'candidate_skills',
  indexes: [
    {
      name: 'candidate_skills_skill_id_index',
      properties: ['skillId'],
    },
  ],
  properties: {
    candidateId: {
      kind: 'm:1',
      entity: () => CandidateSchema,
      mapToPk: true,
      joinColumn: 'candidate_id',
      primary: true,
      deleteRule: 'cascade',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_candidates_id_candidate_skills',
    } as unknown as EntitySchemaProperty<string, CandidateSkill>,
    skillId: {
      kind: 'm:1',
      entity: () => SkillSchema,
      mapToPk: true,
      joinColumn: 'skill_id',
      primary: true,
      deleteRule: 'cascade',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_skills_id_candidate_skills',
    } as unknown as EntitySchemaProperty<string, CandidateSkill>,
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
  },
});
