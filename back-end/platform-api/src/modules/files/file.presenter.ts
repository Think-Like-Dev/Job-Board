import type { File } from './file.schema';
import type { FileAccessGrant } from './file-access-grant.schema';
import type { FileDto, FileGrantDto } from './file-response.dto';

/** Strips storage keys and ownership fields before returning metadata. */
export function toFileDto(file: File): FileDto {
  return {
    id: file.id,
    fileType: file.fileType,
    filename: file.filename,
    mimeType: file.mimeType,
    // PostgreSQL bigint is hydrated as a BigInt, which JSON cannot serialize.
    size:
      file.size === undefined || file.size === null
        ? undefined
        : Number(file.size),
    createdAt: file.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

/** Maps a grant row to the client-facing share shape. */
export function toFileGrantDto(grant: FileAccessGrant): FileGrantDto {
  return {
    fileId: grant.fileId,
    candidateId: grant.candidateId,
    grantedBy: grant.grantedBy ?? undefined,
    createdAt: grant.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}
