import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { CandidateSchema } from '@modules/candidates/candidate.schema';
import { UserSchema } from '@modules/users/user.schema';
import { FileSchema } from './file.schema';

/**
 * Explicit read grant for a file that a candidate does not own. Recruiters use
 * this to share offer letters, signed documents, or other attachments with a
 * specific candidate.
 *
 * Ownership (`files.owner_type`/`owner_id`) stays immutable; grants are
 * additive and revocable.
 */
export interface FileAccessGrant {
  id: string;
  fileId: string;
  candidateId: string;
  /** Internal user who shared the file. */
  grantedBy?: string | null;
  createdAt?: Date;
}

export const FileAccessGrantSchema = new EntitySchema<FileAccessGrant>({
  name: 'FileAccessGrant',
  tableName: 'file_access_grants',
  uniques: [
    {
      name: 'file_access_grants_file_candidate_unique',
      properties: ['fileId', 'candidateId'],
    },
  ],
  indexes: [
    {
      name: 'file_access_grants_candidate_index',
      properties: ['candidateId'],
    },
  ],
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    fileId: {
      kind: 'm:1',
      entity: () => FileSchema,
      mapToPk: true,
      joinColumn: 'file_id',
      deleteRule: 'cascade',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_files_id_file_access_grants',
    } as unknown as EntitySchemaProperty<string, FileAccessGrant>,
    candidateId: {
      kind: 'm:1',
      entity: () => CandidateSchema,
      mapToPk: true,
      joinColumn: 'candidate_id',
      deleteRule: 'cascade',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_candidates_id_file_access_grants',
    } as unknown as EntitySchemaProperty<string, FileAccessGrant>,
    grantedBy: {
      kind: 'm:1',
      entity: () => UserSchema,
      mapToPk: true,
      joinColumn: 'granted_by',
      nullable: true,
      deleteRule: 'set null',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_users_id_file_access_grants',
    } as unknown as EntitySchemaProperty<string, FileAccessGrant>,
    createdAt: { type: 'datetime', defaultRaw: 'now()' },
  },
});
