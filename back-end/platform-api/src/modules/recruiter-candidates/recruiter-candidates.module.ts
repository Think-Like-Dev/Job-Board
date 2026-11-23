import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@modules/applications/applications.module';
import { SessionModule } from '@modules/auth/session.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { FilesModule } from '@modules/files/files.module';
import { ProfilesModule } from '@modules/profiles/profiles.module';
import { SkillsModule } from '@modules/skills/skills.module';
import { CandidateCreateService } from './candidate-create.service';
import { CandidateDetailService } from './candidate-detail.service';
import { CandidateListService } from './candidate-list.service';
import { CandidateQueries } from './candidate-queries';
import { RecruiterCandidatesController } from './recruiter-candidates.controller';

/**
 * Leaf module for the recruiter candidate directory. It can import Candidates,
 * Profiles, Files, Skills, and Applications because none of them import this
 * module, so no `forwardRef` cycle is needed.
 */
@Module({
  imports: [
    SessionModule,
    CandidatesModule,
    ProfilesModule,
    FilesModule,
    SkillsModule,
    ApplicationsModule,
  ],
  controllers: [RecruiterCandidatesController],
  providers: [
    CandidateQueries,
    CandidateListService,
    CandidateDetailService,
    CandidateCreateService,
  ],
})
export class RecruiterCandidatesModule {}
