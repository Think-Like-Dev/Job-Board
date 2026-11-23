import {
  DeferMode,
  EntitySchema,
  type EntitySchemaProperty,
} from '@mikro-orm/core';
import { UserSchema } from '@modules/users/user.schema';
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
  phone?: string | null;
  profileImageFileId?: string | null; // FK -> files.id
  resumeFileId?: string | null; // FK -> files.id (default application resume)
  coverLetterFileId?: string | null; // FK -> files.id (default cover letter)
  currentLocation?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  /** Internal user who pre-created the profile. Null for self-registered candidates. */
  createdBy?: string | null;
  /** Denormalized merged experience total used for list sorting. */
  totalExperienceMonths?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const CandidateSchema = new EntitySchema<Candidate>({
  name: 'Candidate',
  tableName: 'candidates',
  indexes: [{ name: 'candidates_created_by_index', properties: ['createdBy'] }],
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
    resumeFileId: {
      kind: 'm:1',
      entity: () => FileSchema,
      mapToPk: true,
      joinColumn: 'resume_file_id',
      nullable: true,
      deleteRule: 'set null',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_files_id_candidates_resume',
    } as unknown as EntitySchemaProperty<string, Candidate>,
    coverLetterFileId: {
      kind: 'm:1',
      entity: () => FileSchema,
      mapToPk: true,
      joinColumn: 'cover_letter_file_id',
      nullable: true,
      deleteRule: 'set null',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_files_id_candidates_cover',
    } as unknown as EntitySchemaProperty<string, Candidate>,
    currentLocation: { type: 'string', nullable: true },
    address: { type: 'string', nullable: true },
    city: { type: 'string', nullable: true },
    state: { type: 'string', nullable: true },
    country: { type: 'string', nullable: true },
    postalCode: { type: 'string', nullable: true },
    linkedinUrl: { type: 'string', nullable: true },
    portfolioUrl: { type: 'string', nullable: true },
    createdBy: {
      kind: 'm:1',
      entity: () => UserSchema,
      mapToPk: true,
      joinColumn: 'created_by',
      nullable: true,
      deleteRule: 'restrict',
      updateRule: 'no action',
      deferMode: DeferMode.INITIALLY_IMMEDIATE,
      foreignKeyName: 'fk_users_id_candidates_created_by',
    } as unknown as EntitySchemaProperty<string, Candidate>,
    totalExperienceMonths: { type: 'integer', default: 0 },
    createdAt: { type: 'datetime', nullable: true },
    updatedAt: { type: 'datetime', nullable: true },
  },
});
