import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryOrder, type FilterQuery } from '@mikro-orm/core';
import { ApplicationStatus } from '@common/constants/enums';
import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { JobsService } from '@modules/jobs/jobs.service';
import { ApplicationQueries } from './application-queries';
import {
  toRecruiterApplicationDetailDto,
  toRecruiterApplicationListItemDto,
} from './application.presenter';
import { Application } from './application.schema';
import type { JobApplicationsQueryDto } from './dto/application-query.dto';
import type {
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

    const result = await this.queries.findPage(where, query.page, query.limit, {
      appliedAt: QueryOrder.DESC,
    });

    const candidates = await this.queries.findCandidates(
      result.data.map((row) => row.candidateId),
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
        return toRecruiterApplicationListItemDto(
          application,
          candidate,
          files.get(application.resumeFileId),
        );
      }),
      meta: result.meta,
    };
  }

  async getApplication(id: string): Promise<RecruiterApplicationDetailDto> {
    const application = await this.queries.findApplicationById(id);
    if (!application || application.status === ApplicationStatus.DRAFT) {
      throw new NotFoundException('Application not found');
    }

    const [candidate, resume, coverLetter, history] = await Promise.all([
      this.queries.findCandidate(application.candidateId),
      this.queries.findFile(application.resumeFileId),
      application.coverLetterFileId
        ? this.queries.findFile(application.coverLetterFileId)
        : Promise.resolve(null),
      this.queries.findStatusHistory(application.id),
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
