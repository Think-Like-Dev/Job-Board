import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobsService } from './jobs.service';

/**
 * Archives published jobs once their last application date has passed.
 * Runs on startup (to catch up after downtime) and daily at midnight.
 */
@Injectable()
export class JobsExpiryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsExpiryService.name);

  constructor(private readonly jobsService: JobsService) {}

  onApplicationBootstrap(): void {
    void this.archiveExpiredJobs('startup').catch((error: unknown) => {
      this.logger.error('Failed to archive expired jobs on startup', error);
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'UTC' })
  async archiveExpiredJobs(trigger = 'cron'): Promise<void> {
    const archived = await this.jobsService.archiveExpiredJobs();
    if (archived > 0) {
      this.logger.log(`Archived ${archived} expired job(s) via ${trigger}`);
    }
  }
}
