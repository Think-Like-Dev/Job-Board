import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { CandidatesService } from '@modules/candidates/candidates.service';
import {
  FileAccessGrant,
  FileAccessGrantSchema,
} from './file-access-grant.schema';

/**
 * Manages explicit read grants. Kept separate from `FilesService` so file
 * storage/metadata and sharing rules stay independent.
 */
@Injectable()
export class FileAccessGrantsService {
  constructor(
    @InjectRepository(FileAccessGrantSchema)
    private readonly repository: EntityRepository<FileAccessGrant>,
    private readonly candidatesService: CandidatesService,
  ) {}

  /**
   * Grants a candidate read access to a file. Idempotent: re-sharing an
   * existing grant returns the original row.
   */
  async grant(
    fileId: string,
    candidateId: string,
    grantedBy: string,
  ): Promise<FileAccessGrant> {
    // Throws 404 when the candidate does not exist.
    await this.candidatesService.findOne({ id: candidateId });

    const existing = await this.repository.findOne({ fileId, candidateId });
    if (existing) {
      return existing;
    }

    const grant = this.repository.create({
      fileId,
      candidateId,
      grantedBy,
      createdAt: new Date(),
    });
    const em = this.repository.getEntityManager();
    em.persist(grant);
    await em.flush();
    return grant;
  }

  /** Revokes a grant. Returns false when no grant existed. */
  async revoke(fileId: string, candidateId: string): Promise<boolean> {
    const grant = await this.repository.findOne({ fileId, candidateId });
    if (!grant) {
      return false;
    }

    const em = this.repository.getEntityManager();
    em.remove(grant);
    await em.flush();
    return true;
  }

  /** True when the candidate has an explicit grant for the file. */
  async hasGrant(fileId: string, candidateId: string): Promise<boolean> {
    const count = await this.repository.count({ fileId, candidateId });
    return count > 0;
  }

  /** File IDs explicitly shared with a candidate. */
  async listFileIdsForCandidate(candidateId: string): Promise<string[]> {
    const grants = await this.repository.find({ candidateId });
    return grants.map((grant) => grant.fileId);
  }
}
