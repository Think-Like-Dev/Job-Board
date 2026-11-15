import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApplicationSchema } from '@modules/applications/application.schema';
import { SessionModule } from '@modules/auth/session.module';
import { CandidateCertificationSchema } from '@modules/candidates/candidate-certification.schema';
import { CandidateEducationSchema } from '@modules/candidates/candidate-education.schema';
import { CandidateExperienceSchema } from '@modules/candidates/candidate-experience.schema';
import { CandidateProfileVersionSchema } from '@modules/candidates/candidate-profile-version.schema';
import { CandidateSkillSchema } from '@modules/candidates/candidate-skill.schema';
import { CandidateSchema } from '@modules/candidates/candidate.schema';
import { FileSchema } from '@modules/files/file.schema';
import { FilesModule } from '@modules/files/files.module';
import { JobSchema } from '@modules/jobs/job.schema';
import { MessagingModule } from '@modules/messaging/messaging.module';
import { SkillSchema } from '@modules/skills/skill.schema';
import { ProfileController } from './profile.controller';
import { ProfileReadService } from './profile-read.service';
import { ProfileRescoreService } from './profile-rescore.service';
import { ProfileSnapshotService } from './profile-snapshot.service';
import { ProfileWriteService } from './profile-write.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      CandidateSchema,
      CandidateEducationSchema,
      CandidateExperienceSchema,
      CandidateSkillSchema,
      CandidateCertificationSchema,
      CandidateProfileVersionSchema,
      SkillSchema,
      ApplicationSchema,
      FileSchema,
      JobSchema,
    ]),
    SessionModule,
    FilesModule,
    MessagingModule,
  ],
  controllers: [ProfileController],
  providers: [
    ProfileReadService,
    ProfileSnapshotService,
    ProfileWriteService,
    ProfileRescoreService,
  ],
  exports: [ProfileReadService, ProfileWriteService],
})
export class ProfilesModule {}
