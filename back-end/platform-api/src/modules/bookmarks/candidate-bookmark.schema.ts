import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { CandidateSchema } from '@modules/candidates/candidate.schema';
import { JobSchema } from '@modules/jobs/job.schema';

/**
 * A job a candidate saved for later. A join table (instead of an array column
 * on `candidates`) keeps referential integrity, prevents duplicates through a
 * unique constraint, and preserves the save order via `created_at`.
 */
export interface CandidateBookmark {
  id: string;
  candidateId: string;
  jobId: string;
  createdAt?: Date;
}

export const CandidateBookmarkSchema = new EntitySchema<CandidateBookmark>({
  name: 'CandidateBookmark',
  tableName: 'candidate_bookmarks',
  uniques: [
    {
      name: 'candidate_bookmarks_candidate_job_unique',
      properties: ['candidateId', 'jobId'],
    },
  ],
  indexes: [
    {
      name: 'candidate_bookmarks_candidate_id_index',
      properties: ['candidateId'],
    },
    { name: 'candidate_bookmarks_job_id_index', properties: ['jobId'] },
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
      foreignKeyName: 'fk_candidates_id_bookmarks',
    } as unknown as EntitySchemaProperty<string, CandidateBookmark>,
    jobId: {
      kind: 'm:1',
      entity: () => JobSchema,
      mapToPk: true,
      joinColumn: 'job_id',
      deleteRule: 'cascade',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_jobs_id_bookmarks',
    } as unknown as EntitySchemaProperty<string, CandidateBookmark>,
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
  },
});
