import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { CandidateStatus } from '@common/constants/enums';
import { Candidate, CandidateSchema } from './candidate.schema';

@Injectable()
export class CandidatesService extends GenericCrudService<Candidate> {
  constructor(
    @InjectRepository(CandidateSchema)
    repository: EntityRepository<Candidate>,
  ) {
    super(repository);
  }

  /** Finds a candidate by lowercased email. */
  findByEmail(email: string): Promise<Candidate | null> {
    return this.repository.findOne({ email: email.toLowerCase() });
  }

  /**
   * Ensures a candidate profile exists for the given email (used during
   * email+OTP signup). Returns the existing candidate or creates a new one.
   *
   * Reaching this method means the OTP was verified, so an `INVITED` profile
   * (pre-created by a recruiter) becomes `ACTIVE` on its first sign-in.
   */
  async findOrCreateByEmail(email: string): Promise<Candidate> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.findByEmail(normalized);
    if (existing) {
      if (existing.status === CandidateStatus.INVITED) {
        existing.status = CandidateStatus.ACTIVE;
        existing.updatedAt = new Date();
        await this.repository.getEntityManager().flush();
      }
      return existing;
    }
    return this.create({
      email: normalized,
      status: CandidateStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
