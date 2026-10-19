import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { GenericCrudService } from '@common/factory/generic-crud.service';
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
   */
  async findOrCreateByEmail(email: string): Promise<Candidate> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.findByEmail(normalized);
    if (existing) {
      return existing;
    }
    return this.create({
      email: normalized,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
