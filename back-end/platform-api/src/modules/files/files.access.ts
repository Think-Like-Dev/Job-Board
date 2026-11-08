import { FileOwnerType } from '@common/constants/enums';
import type { SessionPayload } from '@modules/auth/auth.service';
import type { File } from './file.schema';

/** The subset of a session needed to decide file access. */
export type FileAccessContext = Pick<
  SessionPayload,
  'principalType' | 'principalId'
>;

/** Maps a session principal to the stored `owner_type` value. */
function ownerTypeFor(context: FileAccessContext): FileOwnerType {
  return context.principalType === 'candidate'
    ? FileOwnerType.CANDIDATE
    : FileOwnerType.USER;
}

/** True when the session principal uploaded the file. */
export function isFileOwner(file: File, context: FileAccessContext): boolean {
  if (!file.ownerType || !file.ownerId) {
    return false;
  }

  return (
    file.ownerType === ownerTypeFor(context) &&
    file.ownerId === context.principalId
  );
}

/**
 * Internal users may read every file (recruiters review candidate resumes and
 * cover letters). Candidates may only read files they uploaded themselves,
 * unless the file was explicitly shared with them.
 */
export function canReadFile(file: File, context: FileAccessContext): boolean {
  return context.principalType === 'user' || isFileOwner(file, context);
}

/** Candidates may read a file explicitly shared with them by an internal user. */
export function canReadSharedFile(
  context: FileAccessContext,
  granted: boolean,
): boolean {
  return context.principalType === 'candidate' && granted;
}

/**
 * Only the uploader may change or delete a file. Legacy/system files without
 * an owner can be managed by internal users.
 */
export function canMutateFile(file: File, context: FileAccessContext): boolean {
  if (!file.ownerType && !file.ownerId) {
    return context.principalType === 'user';
  }

  return isFileOwner(file, context);
}
