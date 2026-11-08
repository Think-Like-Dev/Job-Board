import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { CandidateSchema } from './candidate.schema';

/**
 * Immutable JSONB snapshot of the live profile at the moment a candidate
 * updates it. Applications that were pointing at live data are repointed to
 * the newly created snapshot; new applications keep pointing live.
 *
 * JSONB is deliberate: snapshots are read-only historical evidence for
 * recruiters and later AI analysis, not a source for live filtering. Live
 * filtering uses the normalized live tables.
 */
export interface CandidateProfileVersion {
  id: string;
  candidateId: string;
  versionNumber: number;
  profileData: Record<string, unknown>;
  createdAt?: Date;
}

export const CandidateProfileVersionSchema =
  new EntitySchema<CandidateProfileVersion>({
    name: 'CandidateProfileVersion',
    tableName: 'candidate_profile_versions',
    uniques: [
      {
        name: 'candidate_profile_versions_candidate_version_unique',
        properties: ['candidateId', 'versionNumber'],
      },
    ],
    indexes: [
      {
        name: 'candidate_profile_versions_candidate_id_index',
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
        foreignKeyName: 'fk_candidates_id_candidate_profile_versions',
      } as unknown as EntitySchemaProperty<string, CandidateProfileVersion>,
      versionNumber: { type: 'integer' },
      profileData: { type: 'json', columnType: 'jsonb' },
      createdAt: { type: 'datetime', defaultRaw: 'now()' },
    },
  });
