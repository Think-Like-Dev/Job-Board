import { randomUUID } from 'node:crypto';
import {
  FilterQuery,
  FindOptions,
  QueryOrder,
  RequiredEntityData,
} from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import {
  CompensationType,
  EmploymentType,
  JobStatus,
  WorkMode,
} from '@common/constants/enums';
import { Job, JobSchema } from './job.schema';
import {
  ApplicationSettingsDto,
  CompensationDto,
  CreateJobDto,
  UpdateJobDto,
  UpdateJobStatusDto,
} from './job.dto';
import { ListJobsQueryDto } from './list-jobs-query.dto';
import { assertPublishable, assertTransitionAllowed } from './job.rules';

export interface ArchivePreview {
  jobId: string;
  status: JobStatus;
  confirmedOffersCount: number;
  requiresNoConfirmedOffersAcknowledgement: boolean;
}

type EditableJobFields = Omit<CreateJobDto, 'code' | 'status'>;

/** Concrete scalar payload shared by create and update. */
interface EditableJobData {
  title: string;
  category: string;
  department: string | null;
  designation: string | null;
  employmentType: EmploymentType;
  location: string;
  description: string;
  responsibilities: string | null;
  yearsOfExperience: string | null;
  compensation: CompensationDto | null;
  compensationType: string | null;
  compensationMin: number | null;
  compensationMax: number | null;
  compensationCurrency: string | null;
  workMode: WorkMode[];
  workShiftTiming: string[];
  skills: string[];
  keywords: string[];
  benefits: string[];
  vacancies: number;
  totalInterviewRounds?: number;
  lastApplicationDate: string | null;
  applicationSettings: ApplicationSettingsDto | null;
}

@Injectable()
export class JobsService extends GenericCrudService<Job> {
  constructor(
    @InjectRepository(JobSchema)
    repository: EntityRepository<Job>,
  ) {
    super(repository);
  }

  /**
   * Persists a draft or published job. Drafts only require a title; publishing
   * enforces the README-mandatory fields and a valid compensation shape.
   */
  async createJob(dto: CreateJobDto, createdBy: string): Promise<Job> {
    this.validateCompensation(dto.compensation);
    const fields = this.buildEditableFields(dto);
    if (dto.status === JobStatus.PUBLISHED) {
      assertPublishable(fields);
    }

    const now = new Date();
    const data: RequiredEntityData<Job> = {
      ...fields,
      code: dto.code?.trim() || this.generateCode(),
      status: dto.status,
      createdBy,
      createdAt: now,
      updatedAt: now,
      publishedAt: dto.status === JobStatus.PUBLISHED ? now : null,
      archivedAt: null,
      deletedAt: null,
    };

    return this.create(data);
  }

  /** Full replacement of a draft's editable fields. Published jobs are locked. */
  async updateJob(
    id: string,
    dto: UpdateJobDto,
    principalId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);
    this.assertOwner(job, principalId);
    this.assertDraft(job, 'edited');

    this.validateCompensation(dto.compensation);
    const fields = this.buildEditableFields(dto);

    // Validate the post-update values before mutating the managed entity, so a
    // failed publish cannot leave a dirty job behind.
    if (dto.status === JobStatus.PUBLISHED) {
      assertPublishable(fields);
    }

    this.repository.assign(job, fields);

    const now = new Date();
    if (dto.status && dto.status !== job.status) {
      assertTransitionAllowed(job.status, dto.status);
      job.status = dto.status;
      if (dto.status === JobStatus.PUBLISHED) {
        job.publishedAt = now;
      }
    }
    job.updatedAt = now;

    await this.repository.getEntityManager().flush();
    return job;
  }

  /**
   * Applies a lifecycle transition. Publishing validates the persisted job
   * (not just the request body); archiving requires the irreversible-warning
   * acknowledgement when no offer has been accepted.
   */
  async changeStatus(
    id: string,
    dto: UpdateJobStatusDto,
    principalId: string,
  ): Promise<Job> {
    const job = await this.findJobById(id);
    this.assertOwner(job, principalId);
    assertTransitionAllowed(job.status, dto.status);

    const now = new Date();
    if (dto.status === JobStatus.PUBLISHED) {
      assertPublishable(job);
      job.publishedAt = now;
    } else {
      const preview = await this.getArchivePreview(job.id);
      if (
        preview.requiresNoConfirmedOffersAcknowledgement &&
        !dto.acknowledgeNoConfirmedOffers
      ) {
        throw new BadRequestException(
          'No candidates got confirmed in this Job. Confirm acknowledgeNoConfirmedOffers to archive it permanently.',
        );
      }
      job.archivedAt = now;
    }

    job.status = dto.status;
    job.updatedAt = now;

    await this.repository.getEntityManager().flush();
    return job;
  }

  /** Soft-deletes a draft. Deleted jobs stay in the database for history. */
  async softDeleteJob(id: string, principalId: string): Promise<Job> {
    const job = await this.findJobById(id);
    this.assertOwner(job, principalId);
    this.assertDraft(job, 'deleted');

    job.deletedAt = new Date();
    job.updatedAt = new Date();

    await this.repository.getEntityManager().flush();
    return job;
  }

  async findJobById(
    id: string,
    options: { publicOnly?: boolean } = {},
  ): Promise<Job> {
    const where: FilterQuery<Job> = { id, deletedAt: null };
    if (options.publicOnly) {
      where.status = JobStatus.PUBLISHED;
      where.lastApplicationDate = { $gte: this.todayIsoDate() };
    }

    const job = await this.repository.findOne(where);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  /** Jobs are never hard-deleted; use `softDeleteJob` instead. */
  override remove(): Promise<boolean> {
    return Promise.reject(
      new MethodNotAllowedException(
        'Jobs are soft-deleted; use softDeleteJob instead',
      ),
    );
  }

  /**
   * Paginated listing with the filters the recruiter list page sends. Search
   * and sorting are applied at the database level rather than in memory.
   */
  async listJobs(
    query: ListJobsQueryDto,
    options: { publicOnly?: boolean } = {},
  ): Promise<IPaginatedResult<Job>> {
    const where: FilterQuery<Job> = { deletedAt: null };

    if (options.publicOnly) {
      // Candidates only see published jobs whose closing date has not passed.
      where.status = JobStatus.PUBLISHED;
      where.lastApplicationDate = { $gte: this.todayIsoDate() };
    } else {
      if (query.status) {
        where.status = query.status;
      }
      if (query.recruiterId) {
        where.createdBy = query.recruiterId;
      }
    }

    if (query.category) {
      where.category = { $ilike: `%${query.category.trim()}%` };
    }
    if (query.location) {
      where.location = { $ilike: `%${query.location.trim()}%` };
    }
    if (query.yearsOfExperience) {
      where.yearsOfExperience = {
        $ilike: `%${query.yearsOfExperience.trim()}%`,
      };
    }
    if (query.currency) {
      where.compensationCurrency = query.currency;
    }

    if (query.compensationType) {
      where.compensationType =
        query.compensationType === 'NONE' ? null : query.compensationType;
    }

    // Salary-range filter: include jobs whose pay overlaps the window. A fixed
    // salary is a point (min === max); a range job spans min..max.
    if (query.compensationMin !== undefined) {
      where.compensationMax = { $gte: query.compensationMin };
    }
    if (query.compensationMax !== undefined) {
      where.compensationMin = { $lte: query.compensationMax };
    }

    const search = query.search?.trim();
    if (search) {
      const term = `%${search}%`;
      where.$or = [
        { title: { $ilike: term } },
        { code: { $ilike: term } },
        { category: { $ilike: term } },
        { location: { $ilike: term } },
      ];
    }

    const orderBy =
      query.orderBy === 'compensation'
        ? {
            compensationMin:
              query.orderByDirection === 'ASC'
                ? QueryOrder.ASC_NULLS_LAST
                : QueryOrder.DESC_NULLS_LAST,
          }
        : {
            [query.orderBy]: query.orderByDirection.toLowerCase(),
          };

    return this.findAllPaginated(query, where, {
      orderBy: orderBy as unknown as FindOptions<Job>['orderBy'],
    });
  }

  /**
   * Tells the UI whether archiving needs the "no confirmed candidates" warning.
   * The applications module does not exist yet, so the count is always zero.
   */
  async getArchivePreview(id: string): Promise<ArchivePreview> {
    const job = await this.findJobById(id);
    // The applications module is not implemented yet. Once it exists, count
    // applications with status OFFER_ACCEPTED for this job instead of zero.
    const confirmedOffersCount = 0;

    return {
      jobId: job.id,
      status: job.status,
      confirmedOffersCount,
      requiresNoConfirmedOffersAcknowledgement: confirmedOffersCount === 0,
    };
  }

  /** Archives every published job whose application window has closed. */
  async archiveExpiredJobs(): Promise<number> {
    // Background work has no request context, so MikroORM requires a forked EM.
    const em = this.repository.getEntityManager().fork();
    const repository = em.getRepository(JobSchema);

    const expired = await repository.find({
      status: JobStatus.PUBLISHED,
      deletedAt: null,
      lastApplicationDate: { $lt: this.todayIsoDate() },
    });

    if (!expired.length) {
      return 0;
    }

    const now = new Date();
    for (const job of expired) {
      job.status = JobStatus.ARCHIVED;
      job.archivedAt = now;
      job.updatedAt = now;
    }

    await em.flush();
    return expired.length;
  }

  private buildEditableFields(dto: EditableJobFields): EditableJobData {
    return {
      title: dto.title.trim(),
      category: dto.category?.trim() ?? '',
      department: this.optionalText(dto.department),
      designation: this.optionalText(dto.designation),
      employmentType: dto.employmentType,
      location: dto.location?.trim() ?? '',
      description: dto.description?.trim() ?? '',
      responsibilities: this.optionalText(dto.responsibilities),
      yearsOfExperience: this.optionalText(dto.yearsOfExperience),
      compensation: dto.compensation ?? null,
      compensationType: dto.compensation?.type ?? null,
      compensationMin: this.getCompensationMin(dto.compensation),
      compensationMax: this.getCompensationMax(dto.compensation),
      compensationCurrency: dto.compensation?.currency ?? null,
      workMode: dto.workMode ?? [],
      workShiftTiming: this.normalizeStringArray(dto.workShiftTiming),
      skills: this.normalizeStringArray(dto.skills),
      keywords: this.normalizeStringArray(dto.keywords),
      benefits: this.normalizeStringArray(dto.benefits),
      vacancies: dto.vacancies ?? 1,
      totalInterviewRounds: dto.totalInterviewRounds,
      lastApplicationDate: this.normalizeLastApplicationDate(
        dto.lastApplicationDate,
      ),
      applicationSettings: dto.applicationSettings ?? null,
    };
  }

  private assertOwner(job: Job, principalId: string): void {
    if (job.createdBy !== principalId) {
      throw new ForbiddenException(
        'Only the recruiter who created this job can modify it',
      );
    }
  }

  private assertDraft(job: Job, action: string): void {
    if (job.status !== JobStatus.DRAFT) {
      throw new ConflictException(`Only draft jobs can be ${action}`);
    }
  }

  private normalizeLastApplicationDate(value?: string): string | null {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const parsed = new Date(`${trimmed}T00:00:00Z`);
    if (
      !isIsoDate ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== trimmed
    ) {
      throw new BadRequestException(
        'lastApplicationDate must be a valid YYYY-MM-DD date',
      );
    }

    return trimmed;
  }

  private validateCompensation(compensation?: CompensationDto | null): void {
    if (!compensation) return;

    switch (compensation.type) {
      case CompensationType.FIXED:
        if (
          typeof compensation.amount !== 'number' ||
          !compensation.currency ||
          !compensation.period
        ) {
          throw new BadRequestException(
            'FIXED compensation requires currency, period and a numeric amount',
          );
        }
        break;
      case CompensationType.RANGE:
        if (
          !Array.isArray(compensation.amount) ||
          compensation.amount.length !== 2 ||
          compensation.amount.some((value) => typeof value !== 'number') ||
          !compensation.currency ||
          !compensation.period
        ) {
          throw new BadRequestException(
            'RANGE compensation requires currency, period and a [min, max] amount',
          );
        }
        break;
      case CompensationType.NEGOTIABLE:
        break;
      default:
        throw new BadRequestException('Unsupported compensation type');
    }
  }

  /** Numeric value used for compensation sorting (fixed amount or range min). */
  private getCompensationMin(
    compensation?: CompensationDto | null,
  ): number | null {
    if (!compensation) return null;
    if (compensation.type === CompensationType.FIXED) {
      return typeof compensation.amount === 'number'
        ? compensation.amount
        : null;
    }
    if (compensation.type === CompensationType.RANGE) {
      return Array.isArray(compensation.amount)
        ? compensation.amount[0]
        : null;
    }
    return null;
  }

  /** Upper bound used by the salary-range filter (fixed amount or range max). */
  private getCompensationMax(
    compensation?: CompensationDto | null,
  ): number | null {
    if (!compensation) return null;
    if (compensation.type === CompensationType.FIXED) {
      return typeof compensation.amount === 'number'
        ? compensation.amount
        : null;
    }
    if (compensation.type === CompensationType.RANGE) {
      return Array.isArray(compensation.amount)
        ? compensation.amount[1]
        : null;
    }
    return null;
  }

  private todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private generateCode(): string {
    return `JOB-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  }

  private optionalText(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeStringArray(values?: string[]): string[] {
    return (values ?? []).map((value) => value.trim()).filter(Boolean);
  }
}
