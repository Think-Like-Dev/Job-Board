import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ApplicationStatus } from '@common/constants/enums';
import { Application, ApplicationSchema } from './application.schema';
import {
  topStatusCounts,
  type ApplicationStatusCount,
} from './application.rules';

/** Non-draft application summary attached to recruiter job representations. */
export interface JobApplicationStats {
  totalApplications: number;
  candidateStatusCounts: ApplicationStatusCount[];
}

interface StatusCountRow {
  jobId: string;
  status: ApplicationStatus;
  count: number;
}

/**
 * Aggregates application counts for the recruiter dashboard. Lives in its own
 * module so `JobsModule` can depend on it without importing
 * `ApplicationsModule` (which itself depends on `JobsModule`).
 */
@Injectable()
export class JobApplicationStatsService {
  constructor(
    @InjectRepository(ApplicationSchema)
    private readonly applications: EntityRepository<Application>,
    private readonly em: EntityManager,
  ) {}

  /** One grouped query for every job on the page (no per-job queries). */
  async getStatsForJobs(
    jobIds: string[],
  ): Promise<Map<string, JobApplicationStats>> {
    const uniqueIds = [...new Set(jobIds.filter(Boolean))];
    const stats = new Map<string, JobApplicationStats>();
    for (const id of uniqueIds) {
      stats.set(id, { totalApplications: 0, candidateStatusCounts: [] });
    }

    if (!uniqueIds.length) {
      return stats;
    }

    const tableName = this.em.getMetadata().get(ApplicationSchema).tableName;
    const placeholders = uniqueIds.map(() => '?').join(', ');
    const rows = await this.em.getConnection().execute<StatusCountRow[]>(
      `select job_id as "jobId", status, count(*)::int as count
         from "${tableName}"
        where job_id in (${placeholders}) and status <> ?::application_status
        group by job_id, status`,
      [...uniqueIds, ApplicationStatus.DRAFT],
    );

    for (const row of rows) {
      const entry = stats.get(row.jobId);
      if (!entry) continue;
      const count = Number(row.count);
      entry.totalApplications += count;
      entry.candidateStatusCounts.push({ status: row.status, count });
    }

    for (const entry of stats.values()) {
      entry.candidateStatusCounts = topStatusCounts(
        entry.candidateStatusCounts,
      );
    }

    return stats;
  }

  /** Exact count for one status (used by the archive confirmation check). */
  countByStatus(jobId: string, status: ApplicationStatus): Promise<number> {
    return this.applications.count({ jobId, status });
  }
}
