import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type FilterQuery } from '@mikro-orm/core';
import { ApplicationStatus } from '@common/constants/enums';
import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { JobsService } from '@modules/jobs/jobs.service';
import { ProfileReadService } from '@modules/profiles/profile-read.service';
import type { ProfileView } from '@modules/profiles/profile.types';
import { ApplicationQueries } from './application-queries';
import { parseApplicationSort } from './application-sort';
import {
  toCandidateJobApplicationListItemDto,
  toRecruiterApplicationDetailDto,
  toRecruiterApplicationListItemDto,
} from './application.presenter';
import { Application } from './application.schema';
import type {
  CandidateJobApplicationsQueryDto,
  JobApplicationsQueryDto,
} from './dto/application-query.dto';
import type {
  CandidateJobApplicationListItemDto,
  RecruiterApplicationDetailDto,
  RecruiterApplicationListItemDto,
} from './dto/application-response.dto';

/**
 * Recruiter-facing reads. Drafts are never visible: the list excludes them and
 * the detail endpoint returns 404 for a draft so its existence is not leaked.
 */
@Injectable()
export class RecruiterApplicationsService {
  constructor(
    private readonly queries: ApplicationQueries,
    private readonly jobsService: JobsService,
    private readonly profileRead: ProfileReadService,
  ) {}

  async listJobApplications(
    jobId: string,
    query: JobApplicationsQueryDto,
  ): Promise<IPaginatedResult<RecruiterApplicationListItemDto>> {
    await this.jobsService.findJobById(jobId);

    if (query.status === ApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Draft applications are not visible to recruiters',
      );
    }

    const where: FilterQuery<Application> = { jobId };
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { $ne: ApplicationStatus.DRAFT };
    }

    const search = query.search?.trim();
    if (search) {
      const candidateIds = await this.queries.findCandidateIdsMatchingSearch(
        `%${search}%`,
      );
      if (!candidateIds.length) {
        return emptyPage(query);
      }
      where.candidateId = { $in: candidateIds };
    }

    const result = await this.queries.findPage(
      where,
      query.page,
      query.limit,
      parseApplicationSort(query.sortBy, 'appliedAt'),
    );

    const candidates = await this.queries.findCandidates(
      result.data.map((row) => row.candidateId),
    );
    const versions = await this.queries.findProfileVersions(
      result.data
        .map((row) => row.profileVersionId)
        .filter((id): id is string => Boolean(id)),
    );
    const files = await this.queries.findFiles(
      result.data.map((row) => row.resumeFileId),
    );

    return {
      data: result.data.map((application) => {
        const candidate = candidates.get(application.candidateId);
        if (!candidate) {
          throw new NotFoundException('Candidate not found');
        }
        const profile = application.profileVersionId
          ? (versions.get(application.profileVersionId)?.profileData as
              ProfileView | undefined)
          : undefined;
        return toRecruiterApplicationListItemDto(
          application,
          candidate,
          files.get(application.resumeFileId),
          profile,
        );
      }),
      meta: result.meta,
    };
  }

  /** Recruiter view of one candidate's applications across every job. */
  async listCandidateApplications(
    candidateId: string,
    query: CandidateJobApplicationsQueryDto,
  ): Promise<IPaginatedResult<CandidateJobApplicationListItemDto>> {
    const candidate = await this.queries.findCandidate(candidateId);
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (query.status === ApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Draft applications are not visible to recruiters',
      );
    }

    const where: FilterQuery<Application> = { candidateId };
    if (query.status) {
      where.status = query.status;
    } else {
      where.status = { $ne: ApplicationStatus.DRAFT };
    }

    const result = await this.queries.findPage(
      where,
      query.page,
      query.limit,
      parseApplicationSort(query.sortBy, 'appliedAt'),
    );
    const jobs = await this.queries.findJobs(
      result.data.map((application) => application.jobId),
    );

    return {
      data: result.data.map((application) => {
        const job = jobs.get(application.jobId);
        if (!job) {
          throw new NotFoundException('Job not found');
        }
        return toCandidateJobApplicationListItemDto(application, job);
      }),
      meta: result.meta,
    };
  }

  async getApplication(id: string): Promise<RecruiterApplicationDetailDto> {
    const application = await this.queries.findApplicationById(id);
    if (!application || application.status === ApplicationStatus.DRAFT) {
      throw new NotFoundException('Application not found');
    }

    const [candidate, resume, coverLetter, history, profile] =
      await Promise.all([
        this.queries.findCandidate(application.candidateId),
        this.queries.findFile(application.resumeFileId),
        application.coverLetterFileId
          ? this.queries.findFile(application.coverLetterFileId)
          : Promise.resolve(null),
        this.queries.findStatusHistory(application.id),
        this.profileRead.getApplicationProfile(application),
      ]);

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return toRecruiterApplicationDetailDto(
      application,
      candidate,
      resume,
      coverLetter,
      history,
      profile,
    );
  }
}

function emptyPage(
  query: JobApplicationsQueryDto,
): IPaginatedResult<RecruiterApplicationListItemDto> {
  return {
    data: [],
    meta: {
      totalItems: 0,
      itemCount: 0,
      itemsPerPage: query.limit,
      totalPages: 0,
      currentPage: query.page,
    },
  };
}
