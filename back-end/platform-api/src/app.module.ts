import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from '@src/app.controller';
import { AppService } from '@src/app.service';
import configuration from '@src/config/configuration';
import { RedisModule } from '@common/redis/redis.module';
import { DatabaseModule } from '@src/database/database.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { CandidatesModule } from '@modules/candidates/candidates.module';
import { FilesModule } from '@modules/files/files.module';
import { JobsModule } from '@modules/jobs/jobs.module';
import { ApplicationsModule } from '@modules/applications/applications.module';
import { SkillsModule } from '@modules/skills/skills.module';
import { ProfilesModule } from '@modules/profiles/profiles.module';
import { BookmarksModule } from '@modules/bookmarks/bookmarks.module';
import { MessagingModule } from '@modules/messaging/messaging.module';
import { AiScoringModule } from '@modules/ai-scoring/ai-scoring.module';
import { RecruiterCandidatesModule } from '@modules/recruiter-candidates/recruiter-candidates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Load environment-specific overrides: `.env.<NODE_ENV>` wins over `.env`.
      // The shared file lives one level up, so the API runs on the host with
      // `pnpm start:dev` without exporting anything; inside Docker it is not
      // mounted and the variables arrive from compose. A local file still wins.
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'local'}`,
        '.env',
        `../env/.env.${process.env.NODE_ENV ?? 'local'}`,
      ],
    }),
    RedisModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    CandidatesModule,
    FilesModule,
    JobsModule,
    ApplicationsModule,
    SkillsModule,
    ProfilesModule,
    BookmarksModule,
    RecruiterCandidatesModule,
    MessagingModule,
    AiScoringModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
