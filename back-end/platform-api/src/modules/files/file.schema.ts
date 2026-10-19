import { EntitySchema } from '@mikro-orm/core';
import { FileType } from '@common/constants/enums';

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
  size?: number;
  storagePath?: string;
  createdAt?: Date;
}

export const FileSchema = new EntitySchema<File>({
  name: 'File',
  tableName: 'files',
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
    createdAt: { type: 'datetime', nullable: true },
  },
});
