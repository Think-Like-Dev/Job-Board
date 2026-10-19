import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { FileSchema } from '../files/file.schema';

/**
 * Candidate account/profile. Candidates are NOT users — they have no
 * password and are authenticated via email + OTP. Their profile image is
 * a `File` referenced through `profileImageFileId`.
 *
 * Defined with the MikroORM v7 `EntitySchema` API (decorators were removed in v7).
 */
export interface Candidate {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profileImageFileId?: string; // FK -> files.id
  linkedinUrl?: string;
  portfolioUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateSchema = new EntitySchema<Candidate>({
  name: 'Candidate',
  tableName: 'candidates',
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    email: { type: 'string', unique: true },
    firstName: { type: 'string', nullable: true },
    lastName: { type: 'string', nullable: true },
    phone: { type: 'string', nullable: true },
    // `mapToPk` keeps the public property as the file's UUID string. The
    // EntitySchema generic cannot express a to-one relation whose property
    // type is the target PK, hence the narrow cast.
    profileImageFileId: {
      kind: 'm:1',
      entity: () => FileSchema,
      mapToPk: true,
      joinColumn: 'profile_image_file_id',
      nullable: true,
      deleteRule: 'restrict',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_files_id_candidates',
    } as unknown as EntitySchemaProperty<string, Candidate>,
    linkedinUrl: { type: 'string', nullable: true },
    portfolioUrl: { type: 'string', nullable: true },
    createdAt: { type: 'datetime', nullable: true },
    updatedAt: { type: 'datetime', nullable: true },
  },
});
