import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SessionModule } from '@modules/auth/session.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { FilesModule } from '@modules/files/files.module';
import { JobsModule } from '@modules/jobs/jobs.module';
import { ProfilesModule } from '@modules/profiles/profiles.module';
import { ApplicationStatusHistorySchema } from './application-status-history.schema';
import { ApplicationQueries } from './application-queries';
import { ApplicationsService } from './applications.service';
import { RecruiterApplicationsService } from './recruiter-applications.service';
import { ApplicationSchema } from './application.schema';
import { CandidateApplicationsController } from './candidate-applications.controller';
import { JobApplicationsController } from './job-applications.controller';
import { RecruiterApplicationsController } from './recruiter-applications.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      ApplicationSchema,
      ApplicationStatusHistorySchema,
    ]),
    SessionModule,
    JobsModule,
    FilesModule,
    CandidatesModule,
    ProfilesModule,
  ],
  // Candidate routes are registered first so `GET /applications/my` is matched
  // before the recruiter's `GET /applications/:id`.
  controllers: [
    CandidateApplicationsController,
    JobApplicationsController,
    RecruiterApplicationsController,
  ],
  providers: [
    ApplicationsService,
    RecruiterApplicationsService,
    ApplicationQueries,
  ],
  exports: [ApplicationsService, RecruiterApplicationsService],
})
export class ApplicationsModule {}
