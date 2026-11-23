import { Injectable } from '@nestjs/common';
import { CandidateExperienceService } from '@modules/candidates/candidate-experience.service';
import { CandidatesService } from '@modules/candidates/candidates.service';
import { ProfileReadService } from '@modules/profiles/profile-read.service';
import { toCandidateDetailDto } from './candidate.presenter';
import type { CandidateDetailDto } from './dto/candidate-response.dto';

@Injectable()
export class CandidateDetailService {
  constructor(
    private readonly candidates: CandidatesService,
    private readonly profiles: ProfileReadService,
    private readonly experience: CandidateExperienceService,
  ) {}

  async get(id: string): Promise<CandidateDetailDto> {
    const candidate = await this.candidates.findOne({ id });

    // Sequential because both reads share the root EntityManager and the
    // experience refresh may flush a new total.
    const profile = await this.profiles.getLiveProfile(id);
    const calculation = await this.experience.recomputeIfOpenEnded(id);

    return toCandidateDetailDto(candidate, profile, calculation);
  }
}
