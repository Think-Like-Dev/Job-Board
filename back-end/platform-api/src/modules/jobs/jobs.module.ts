import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SessionModule } from '@modules/auth/session.module';
import { ApplicationStatsModule } from '@modules/applications/application-stats.module';
import { JobSchema } from './job.schema';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PublicJobsController } from './public-jobs.controller';
import { JobsExpiryService } from './jobs-expiry.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([JobSchema]),
    SessionModule,
    ApplicationStatsModule,
  ],
  controllers: [JobsController, PublicJobsController],
  providers: [JobsService, JobsExpiryService],
  exports: [JobsService],
})
export class JobsModule {}
