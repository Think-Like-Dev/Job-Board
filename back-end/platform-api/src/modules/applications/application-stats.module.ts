import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ApplicationSchema } from './application.schema';
import { JobApplicationStatsService } from './job-application-stats.service';

/**
 * Depends only on the Application entity so `JobsModule` can import it without
 * creating a cycle with `ApplicationsModule` (which imports `JobsModule`).
 */
@Module({
  imports: [MikroOrmModule.forFeature([ApplicationSchema])],
  providers: [JobApplicationStatsService],
  exports: [JobApplicationStatsService],
})
export class ApplicationStatsModule {}
