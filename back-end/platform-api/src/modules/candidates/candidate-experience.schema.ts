import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { CandidateSchema } from './candidate.schema';
import {
  softDeleteFilter,
  softDeleteProperty,
  type SoftDeletable,
} from '@common/persistence/soft-delete';

/** One work-history entry on the candidate's live profile. */
export interface CandidateExperience extends SoftDeletable {
  id: string;
  candidateId: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string | null;
  salary?: string | null;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateExperienceSchema = new EntitySchema<CandidateExperience>({
  name: 'CandidateExperience',
  tableName: 'candidate_experience',
  filters: softDeleteFilter,
  indexes: [
    {
      name: 'candidate_experience_candidate_id_index',
      properties: ['candidateId'],
    },
  ],
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    candidateId: {
      kind: 'm:1',
      entity: () => CandidateSchema,
      mapToPk: true,
      joinColumn: 'candidate_id',
      deleteRule: 'cascade',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_candidates_id_candidate_experience',
    } as unknown as EntitySchemaProperty<string, CandidateExperience>,
    companyName: { type: 'string' },
    jobTitle: { type: 'string' },
    startDate: { type: 'date' },
    endDate: { type: 'date', nullable: true },
    salary: { type: 'string', nullable: true },
    description: { type: 'text', nullable: true },
    ...softDeleteProperty,
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
    updatedAt: {
      type: 'datetime',
      defaultRaw: 'now()',
      onUpdate: () => new Date(),
    },
  },
});
