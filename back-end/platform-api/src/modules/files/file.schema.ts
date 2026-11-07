import { EntitySchema } from '@mikro-orm/core';
import { FileOwnerType, FileType } from '@common/constants/enums';

/**
 * Stored upload (resume, cover letter, offer letter, profile image, ...).
 * Only metadata is persisted — the blob lives on object storage and
 * `storagePath` points to it.
 *
 * Defined with the MikroORM v7 `EntitySchema` API (decorators were removed in v7).
 */
export interface File {
  id: string;
  fileType?: FileType;
  filename?: string;
  mimeType?: string;
  size?: number | bigint;
  storagePath?: string;
  /** Principal that uploaded the file. Null only for legacy/system files. */
  ownerType?: FileOwnerType | null;
  /** Candidate or user UUID matching `ownerType`. */
  ownerId?: string | null;
  createdAt?: Date;
}

export const FileSchema = new EntitySchema<File>({
  name: 'File',
  tableName: 'files',
  indexes: [
    { name: 'files_owner_index', properties: ['ownerType', 'ownerId'] },
  ],
  checks: [
    {
      name: 'files_owner_pair_check',
      expression: '("owner_type" is null) = ("owner_id" is null)',
    },
  ],
  properties: {
    id: { type: 'uuid', primary: true, defaultRaw: 'gen_random_uuid()' },
    fileType: {
      enum: true,
      items: () => FileType,
      nativeEnumName: 'file_type',
      nullable: true,
    },
    filename: { type: 'string', nullable: true },
    mimeType: { type: 'string', nullable: true },
    size: { type: 'bigint', nullable: true },
    storagePath: { type: 'string', nullable: true },
    ownerType: {
      enum: true,
      items: () => FileOwnerType,
      nativeEnumName: 'file_owner_type',
      nullable: true,
    },
    ownerId: { type: 'uuid', nullable: true },
    createdAt: { type: 'datetime', nullable: true },
  },
});
