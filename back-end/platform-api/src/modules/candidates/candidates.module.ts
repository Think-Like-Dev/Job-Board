import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SessionModule } from '@modules/auth/session.module';
import { CandidateSchema } from './candidate.schema';
import { CandidateExperienceService } from './candidate-experience.service';
import { CandidatesService } from './candidates.service';

/**
 * Candidate domain core. The recruiter-facing HTTP surface lives in the leaf
 * `RecruiterCandidatesModule` so this module can be imported by Files,
 * Applications, and Profiles without creating a dependency cycle.
 */
@Module({
  imports: [MikroOrmModule.forFeature([CandidateSchema]), SessionModule],
  providers: [CandidatesService, CandidateExperienceService],
  exports: [CandidatesService, CandidateExperienceService],
})
export class CandidatesModule {}
