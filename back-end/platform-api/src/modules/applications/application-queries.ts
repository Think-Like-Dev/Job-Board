import { InjectRepository } from '@mikro-orm/nestjs';
import {
  QueryOrder,
  type FilterQuery,
  type FindOptions,
} from '@mikro-orm/core';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import {
  Candidate,
  CandidateSchema,
} from '@modules/candidates/candidate.schema';
import { File, FileSchema } from '@modules/files/file.schema';
import { Job, JobSchema } from '@modules/jobs/job.schema';
import {
  ApplicationStatusHistory,
  ApplicationStatusHistorySchema,
} from './application-status-history.schema';
import { Application, ApplicationSchema } from './application.schema';

/**
 * Read-side database access for applications. Keeps joins and pagination out
 * of the business services so each service stays focused on one job.
 */
@Injectable()
export class ApplicationQueries {
  constructor(
    @InjectRepository(ApplicationSchema)
    private readonly applications: EntityRepository<Application>,
    private readonly em: EntityManager,
  ) {}

  findApplicationById(id: string): Promise<Application | null> {
    return this.applications.findOne({ id });
  }

  findApplicationForCandidate(
    id: string,
    candidateId: string,
  ): Promise<Application | null> {
    return this.applications.findOne({ id, candidateId });
  }

  findApplicationForJob(
    candidateId: string,
    jobId: string,
  ): Promise<Application | null> {
    return this.applications.findOne({ candidateId, jobId });
  }

  async findPage(
    where: FilterQuery<Application>,
    page: number,
    limit: number,
    orderBy: FindOptions<Application>['orderBy'],
  ): Promise<IPaginatedResult<Application>> {
    // MikroORM v7's `IndexName<Entity>` generic cannot be resolved here.
    const [data, totalItems] = await this.applications.findAndCount(where, {
      limit,
      offset: (page - 1) * limit,
      orderBy,
    });

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  findJob(id: string): Promise<Job | null> {
    return this.em.findOne(JobSchema, { id });
  }

  async findJobs(ids: string[]): Promise<Map<string, Job>> {
    if (!ids.length) {
      return new Map();
    }
    const jobs = await this.em.find(JobSchema, { id: { $in: ids } });
    return new Map(jobs.map((job) => [job.id, job]));
  }

  findFile(id: string): Promise<File | null> {
    return this.em.findOne(FileSchema, { id });
  }

  async findFiles(ids: string[]): Promise<Map<string, File>> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) {
      return new Map();
    }
    const files = await this.em.find(FileSchema, { id: { $in: uniqueIds } });
    return new Map(files.map((file) => [file.id, file]));
  }

  findCandidate(id: string): Promise<Candidate | null> {
    return this.em.findOne(CandidateSchema, { id });
  }

  async findCandidates(ids: string[]): Promise<Map<string, Candidate>> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) {
      return new Map();
    }
    const candidates = await this.em.find(CandidateSchema, {
      id: { $in: uniqueIds },
    });
    return new Map(candidates.map((candidate) => [candidate.id, candidate]));
  }

  /** Candidate IDs whose first name, last name, or email matches `term`. */
  async findCandidateIdsMatchingSearch(term: string): Promise<string[]> {
    const candidates = await this.em.find(
      CandidateSchema,
      {
        $or: [
          { firstName: { $ilike: term } },
          { lastName: { $ilike: term } },
          { email: { $ilike: term } },
        ],
      },
      { fields: ['id'] },
    );
    return candidates.map((candidate) => candidate.id);
  }

  findStatusHistory(
    applicationId: string,
  ): Promise<ApplicationStatusHistory[]> {
    return this.em.find(
      ApplicationStatusHistorySchema,
      { applicationId },
      { orderBy: { createdAt: QueryOrder.ASC } },
    );
  }
}
