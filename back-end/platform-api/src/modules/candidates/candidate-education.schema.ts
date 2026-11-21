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

/** One education entry on the candidate's live profile. */
export interface CandidateEducation extends SoftDeletable {
  id: string;
  candidateId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  /** PostgreSQL decimal hydrates as a string. */
  gpa?: string | null;
  additionalDetails?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateEducationSchema = new EntitySchema<CandidateEducation>({
  name: 'CandidateEducation',
  tableName: 'candidate_education',
  filters: softDeleteFilter,
  indexes: [
    {
      name: 'candidate_education_candidate_id_index',
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
      foreignKeyName: 'fk_candidates_id_candidate_education',
    } as unknown as EntitySchemaProperty<string, CandidateEducation>,
    institution: { type: 'string' },
    degree: { type: 'string' },
    fieldOfStudy: { type: 'string' },
    startDate: { type: 'date' },
    endDate: { type: 'date', nullable: true },
    grade: { type: 'string', nullable: true },
    gpa: { type: 'decimal', precision: 4, scale: 2, nullable: true },
    additionalDetails: { type: 'text', nullable: true },
    ...softDeleteProperty,
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
    updatedAt: {
      type: 'datetime',
      defaultRaw: 'now()',
      onUpdate: () => new Date(),
    },
  },
});
