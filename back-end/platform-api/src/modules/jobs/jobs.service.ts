import { randomUUID } from 'node:crypto';
import { FilterQuery, FindOptions, RequiredEntityData } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable } from '@nestjs/common';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { CompensationType, JobStatus } from '@common/constants/enums';
import { Job, JobSchema } from './job.schema';
import { CompensationDto, CreateJobDto } from './job.dto';
import { ListJobsQueryDto } from './list-jobs-query.dto';

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
    const lastApplicationDate = this.normalizeLastApplicationDate(
      dto.lastApplicationDate,
    );
    if (dto.status === JobStatus.PUBLISHED) {
      this.assertPublishable(dto);
    }

    const data: RequiredEntityData<Job> = {
      code: dto.code?.trim() || this.generateCode(),
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
      workMode: dto.workMode ?? [],
      workShiftTiming: this.normalizeStringArray(dto.workShiftTiming),
      skills: this.normalizeStringArray(dto.skills),
      keywords: this.normalizeStringArray(dto.keywords),
      benefits: this.normalizeStringArray(dto.benefits),
      vacancies: dto.vacancies ?? 1,
      totalInterviewRounds: dto.totalInterviewRounds,
      lastApplicationDate,
      applicationSettings: dto.applicationSettings ?? null,
      status: dto.status,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.create(data);
  }

  /**
   * Paginated listing with the filters the recruiter list page sends. Search
   * and sorting are applied at the database level rather than in memory.
   */
  async listJobs(query: ListJobsQueryDto): Promise<IPaginatedResult<Job>> {
    const where: FilterQuery<Job> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.recruiterId) {
      where.createdBy = query.recruiterId;
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

    const orderBy = {
      [query.orderBy]: query.orderByDirection.toLowerCase(),
    } as unknown as FindOptions<Job>['orderBy'];

    return this.findAllPaginated(query, where, { orderBy });
  }

  private assertPublishable(dto: CreateJobDto): void {
    const missing: string[] = [];
    if (!dto.category?.trim()) missing.push('category');
    if (!dto.location?.trim()) missing.push('location');
    if (!dto.description?.trim()) missing.push('description');
    if (!dto.workMode?.length) missing.push('workMode');
    if (!dto.skills?.some((skill) => skill.trim())) missing.push('skills');
    if (dto.totalInterviewRounds === undefined) {
      missing.push('totalInterviewRounds');
    }
    if (!dto.lastApplicationDate?.trim()) {
      missing.push('lastApplicationDate');
    }

    if (missing.length) {
      throw new BadRequestException(
        `Missing required fields for publishing: ${missing.join(', ')}`,
      );
    }
  }

  private normalizeLastApplicationDate(value?: string): string | undefined {
    const trimmed = value?.trim();
    if (!trimmed) return undefined;

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

  private generateCode(): string {
    return `JOB-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
  }

  private optionalText(value?: string): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private normalizeStringArray(values?: string[]): string[] {
    return (values ?? []).map((value) => value.trim()).filter(Boolean);
  }
}
