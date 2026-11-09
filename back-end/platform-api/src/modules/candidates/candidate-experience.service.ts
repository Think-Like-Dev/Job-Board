import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { CandidateEducationSchema } from './candidate-education.schema';
import { CandidateExperienceSchema } from './candidate-experience.schema';
import { CandidateSchema } from './candidate.schema';
import {
  calculateExperience,
  type ExperienceCalculation,
} from './experience/experience-calculator';

/**
 * Persists the denormalized experience total. The pure calculator stays in
 * `experience/experience-calculator.ts` so profile writes and the backfill
 * script can reuse the same rules without a Nest dependency.
 */
@Injectable()
export class CandidateExperienceService {
  constructor(private readonly em: EntityManager) {}

  /** Always recomputes and persists. Used on profile saves and candidate create. */
  async recompute(
    candidateId: string,
    em: EntityManager = this.em,
  ): Promise<ExperienceCalculation> {
    const { candidate, calculation } = await this.loadAndCalculate(
      candidateId,
      em,
    );

    candidate.totalExperienceMonths = calculation.totalMonths;
    await em.flush();
    return calculation;
  }

  /**
   * Recomputes without persisting when every job is closed (the stored value
   * cannot drift), and persists when at least one job is open-ended.
   */
  async recomputeIfOpenEnded(
    candidateId: string,
    em: EntityManager = this.em,
  ): Promise<ExperienceCalculation> {
    const { candidate, experience, calculation } = await this.loadAndCalculate(
      candidateId,
      em,
    );

    const hasOpenEnded = experience.some((row) => !row.endDate);
    if (
      hasOpenEnded &&
      candidate.totalExperienceMonths !== calculation.totalMonths
    ) {
      candidate.totalExperienceMonths = calculation.totalMonths;
      await em.flush();
    }

    return calculation;
  }

  private async loadAndCalculate(candidateId: string, em: EntityManager) {
    const [candidate, education, experience] = await Promise.all([
      em.findOne(CandidateSchema, { id: candidateId }),
      em.find(CandidateEducationSchema, { candidateId }),
      em.find(CandidateExperienceSchema, { candidateId }),
    ]);

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return {
      candidate,
      education,
      experience,
      calculation: calculateExperience(experience, education),
    };
  }
}
