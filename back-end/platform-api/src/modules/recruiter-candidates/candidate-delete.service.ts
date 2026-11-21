import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CandidateStatus, UserRole } from '@common/constants/enums';
import type { SessionPayload } from '@modules/auth/auth.service';
import { CandidatesService } from '@modules/candidates/candidates.service';
import { FilesService } from '@modules/files/files.service';

/**
 * Hard delete for a candidate profile a recruiter created by mistake.
 *
 * Only `INVITED` profiles are removable: the person never signed in, so the
 * profile holds no applications or history. The creator (or an admin) may
 * delete it, and the candidate-owned files are cleaned up afterwards.
 */
@Injectable()
export class CandidateDeleteService {
  constructor(
    private readonly em: EntityManager,
    private readonly candidates: CandidatesService,
    private readonly files: FilesService,
  ) {}

  async deleteInvited(actor: SessionPayload, id: string): Promise<boolean> {
    const candidate = await this.candidates.findOne({ id });

    if (candidate.status !== CandidateStatus.INVITED) {
      throw new BadRequestException('Only an invited candidate can be deleted');
    }

    const isAdmin = (actor.role as UserRole) === UserRole.ADMIN;
    if (!isAdmin && candidate.createdBy !== actor.principalId) {
      throw new ForbiddenException(
        'You can only delete a candidate you created',
      );
    }

    const fileIds = [
      candidate.resumeFileId,
      candidate.coverLetterFileId,
      candidate.profileImageFileId,
    ].filter((fileId): fileId is string => Boolean(fileId));

    this.em.remove(candidate);
    await this.em.flush();

    // The candidate row is gone, so nothing references these files except a
    // possible application snapshot; `removeIfUnreferenced` handles that and
    // removes the stored object too.
    for (const fileId of fileIds) {
      await this.files.removeIfUnreferenced(fileId).catch(() => undefined);
    }

    return true;
  }
}
