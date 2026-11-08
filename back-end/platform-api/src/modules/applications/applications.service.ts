import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  DriverException,
  QueryOrder,
  UniqueConstraintViolationException,
  type EntityManager,
  type FilterQuery,
} from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/postgresql';
import { ApplicationStatus, FileType } from '@common/constants/enums';
import type { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import type { SessionPayload } from '@modules/auth/auth.service';
import {
  Candidate,
  CandidateSchema,
} from '@modules/candidates/candidate.schema';
import { CandidatesService } from '@modules/candidates/candidates.service';
import { assertUploadMatchesType } from '@modules/files/file-validation';
import { FilesService } from '@modules/files/files.service';
import { JobsService } from '@modules/jobs/jobs.service';
import { ApplicationQueries } from './application-queries';
import {
  assertCanApply,
  assertDraftDeletable,
  assertJobAcceptsApplications,
  assertWithdrawable,
} from './application.rules';
import {
  toCandidateApplicationDetailDto,
  toCandidateApplicationSummaryDto,
} from './application.presenter';
import { Application, ApplicationSchema } from './application.schema';
import { ApplicationStatusHistorySchema } from './application-status-history.schema';
import type { ApplyJobDto } from './dto/apply-job.dto';
import type { CandidateApplicationsQueryDto } from './dto/application-query.dto';
import type {
  CandidateApplicationDetailDto,
  CandidateApplicationSummaryDto,
} from './dto/application-response.dto';
import type { WithdrawApplicationDto } from './dto/withdraw-application.dto';

/** Optional multipart parts accepted by the apply endpoint. */
export interface ApplicationUploads {
  resumeFile?: Express.Multer.File;
  coverLetterFile?: Express.Multer.File;
}

interface ResolvedResume {
  fileId: string;
  uploadedFileId: string | null;
}

interface PersistResult {
  applicationId: string;
  replacedResumeFileId: string | null;
  replacedCoverLetterFileId: string | null;
  previousProfileResumeId: string | null;
}

interface PersistInput {
  candidateId: string;
  jobId: string;
  existing: Application | null;
  resumeFileId: string;
  coverLetterFileId: string | null;
  isDraft: boolean;
  updateProfileResume: boolean;
  uploadedResumeId: string | null;
}

/**
 * Candidate-facing application lifecycle: apply, save/update a draft, list,
 * read, withdraw, and hard-delete a draft. Recruiter reads live in
 * `RecruiterApplicationsService`.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(ApplicationSchema)
    private readonly repository: EntityRepository<Application>,
    private readonly queries: ApplicationQueries,
    private readonly jobsService: JobsService,
    private readonly candidatesService: CandidatesService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Creates or updates the candidate's application for a job. Drafts can be
   * updated until they are submitted; submitted applications are immutable
   * except for withdrawal.
   */
  async apply(
    jobId: string,
    dto: ApplyJobDto,
    uploads: ApplicationUploads,
    session: SessionPayload,
  ): Promise<CandidateApplicationDetailDto> {
    const candidateId = session.principalId;
    const job = await this.jobsService.findJobById(jobId);
    assertJobAcceptsApplications(job);

    const candidate = await this.candidatesService.findOne({ id: candidateId });
    const existing = await this.queries.findApplicationForJob(
      candidateId,
      jobId,
    );
    assertCanApply(existing?.status);

    const isDraft = dto.isDraft === true;
    const createdFileIds: string[] = [];
    let committed = false;

    if (
      !isDraft &&
      job.applicationSettings?.coverLetterRequired &&
      !uploads.coverLetterFile &&
      !existing?.coverLetterFileId
    ) {
      throw new BadRequestException('A cover letter is required for this job');
    }

    try {
      const resume = await this.resolveResume(
        dto,
        uploads,
        existing,
        candidate,
        session,
        createdFileIds,
      );
      const coverLetterFileId = await this.resolveCoverLetter(
        uploads,
        existing,
        session,
        createdFileIds,
      );

      const result = await this.persistApplication({
        candidateId,
        jobId,
        existing,
        resumeFileId: resume.fileId,
        coverLetterFileId,
        isDraft,
        updateProfileResume: dto.updateProfileResume === true,
        uploadedResumeId: resume.uploadedFileId,
      });
      committed = true;

      await this.cleanupReplacedFiles(result, candidateId);
      return await this.getCandidateApplication(
        result.applicationId,
        candidateId,
      );
    } catch (error) {
      if (!committed) {
        await this.cleanupCreatedFiles(createdFileIds);
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException('Already applied for this job');
      }
      throw error;
    }
  }

  /** Candidate list: includes drafts, newest first, optionally by status. */
  async listCandidateApplications(
    query: CandidateApplicationsQueryDto,
    candidateId: string,
  ): Promise<IPaginatedResult<CandidateApplicationSummaryDto>> {
    const where: FilterQuery<Application> = { candidateId };
    if (query.status) {
      where.status = query.status;
    }

    const result = await this.queries.findPage(where, query.page, query.limit, {
      createdAt: QueryOrder.DESC,
    });

    const jobs = await this.queries.findJobs(
      result.data.map((row) => row.jobId),
    );
    const files = await this.queries.findFiles(
      result.data
        .flatMap((row) => [row.resumeFileId, row.coverLetterFileId])
        .filter((fileId): fileId is string => Boolean(fileId)),
    );

    return {
      data: result.data.map((application) =>
        toCandidateApplicationSummaryDto(
          application,
          jobs.get(application.jobId),
          files.get(application.resumeFileId),
          application.coverLetterFileId
            ? files.get(application.coverLetterFileId)
            : null,
        ),
      ),
      meta: result.meta,
    };
  }

  /** Candidate detail, including the status history. */
  async getCandidateApplication(
    id: string,
    candidateId: string,
  ): Promise<CandidateApplicationDetailDto> {
    const application = await this.queries.findApplicationForCandidate(
      id,
      candidateId,
    );
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const [job, resume, coverLetter, history] = await Promise.all([
      this.queries.findJob(application.jobId),
      this.queries.findFile(application.resumeFileId),
      application.coverLetterFileId
        ? this.queries.findFile(application.coverLetterFileId)
        : Promise.resolve(null),
      this.queries.findStatusHistory(application.id),
    ]);

    return toCandidateApplicationDetailDto(
      application,
      job,
      resume,
      coverLetter,
      history,
    );
  }

  /** Withdrawal is only allowed while the application is still `APPLIED`. */
  async withdraw(
    id: string,
    dto: WithdrawApplicationDto,
    candidateId: string,
  ): Promise<CandidateApplicationDetailDto> {
    const em = this.repository.getEntityManager();
    const now = new Date();

    await em.transactional(async (txEm) => {
      const application = await txEm
        .getRepository(ApplicationSchema)
        .findOne({ id, candidateId });
      if (!application) {
        throw new NotFoundException('Application not found');
      }
      assertWithdrawable(application.status);

      application.status = ApplicationStatus.WITHDRAWN;
      application.withdrawnAt = now;
      application.updatedAt = now;
      this.recordHistory(
        txEm,
        application.id,
        ApplicationStatus.APPLIED,
        ApplicationStatus.WITHDRAWN,
        dto.reason?.trim() || null,
        candidateId,
      );
      await txEm.flush();
    });

    return this.getCandidateApplication(id, candidateId);
  }

  /**
   * Hard-deletes a draft and its history so the candidate can start over.
   * Files uploaded only for the draft are removed unless still referenced by
   * the candidate profile or another application.
   */
  async deleteDraft(id: string, candidateId: string): Promise<void> {
    const em = this.repository.getEntityManager();

    const fileIds = await em.transactional(async (txEm) => {
      const application = await txEm
        .getRepository(ApplicationSchema)
        .findOne({ id, candidateId });
      if (!application) {
        throw new NotFoundException('Application not found');
      }
      assertDraftDeletable(application.status);

      const ids = [
        ...new Set(
          [application.resumeFileId, application.coverLetterFileId].filter(
            (fileId): fileId is string => Boolean(fileId),
          ),
        ),
      ];

      txEm.remove(application);
      await txEm.flush();
      return ids;
    });

    const candidate = await this.candidatesService.findOne({
      id: candidateId,
    });

    for (const fileId of fileIds) {
      if (fileId === candidate.resumeFileId) {
        continue;
      }
      await this.filesService.removeIfUnreferenced(fileId);
    }
  }

  private async resolveResume(
    dto: ApplyJobDto,
    uploads: ApplicationUploads,
    existing: Application | null,
    candidate: Candidate,
    session: SessionPayload,
    createdFileIds: string[],
  ): Promise<ResolvedResume> {
    if (uploads.resumeFile) {
      assertUploadMatchesType(uploads.resumeFile, FileType.RESUME);
      const file = await this.filesService.registerAndUpload(
        uploads.resumeFile,
        FileType.RESUME,
        session,
      );
      createdFileIds.push(file.id);
      return { fileId: file.id, uploadedFileId: file.id };
    }

    if (dto.existingResumeFileId) {
      await this.filesService.findCandidateFile(
        dto.existingResumeFileId,
        candidate.id,
        FileType.RESUME,
      );
      return { fileId: dto.existingResumeFileId, uploadedFileId: null };
    }

    const fallback = existing?.resumeFileId ?? candidate.resumeFileId;
    if (fallback) {
      return { fileId: fallback, uploadedFileId: null };
    }

    throw new BadRequestException('A resume is required to apply');
  }

  private async resolveCoverLetter(
    uploads: ApplicationUploads,
    existing: Application | null,
    session: SessionPayload,
    createdFileIds: string[],
  ): Promise<string | null> {
    if (uploads.coverLetterFile) {
      assertUploadMatchesType(uploads.coverLetterFile, FileType.COVER_LETTER);
      const file = await this.filesService.registerAndUpload(
        uploads.coverLetterFile,
        FileType.COVER_LETTER,
        session,
      );
      createdFileIds.push(file.id);
      return file.id;
    }

    return existing?.coverLetterFileId ?? null;
  }

  private persistApplication(input: PersistInput): Promise<PersistResult> {
    const em = this.repository.getEntityManager();
    const now = new Date();

    return em.transactional(async (txEm) => {
      const applicationRepository = txEm.getRepository(ApplicationSchema);
      let application: Application;
      let replacedResumeFileId: string | null = null;
      let replacedCoverLetterFileId: string | null = null;
      let previousProfileResumeId: string | null = null;

      if (input.existing) {
        application = await applicationRepository.findOneOrFail({
          id: input.existing.id,
          candidateId: input.candidateId,
        });
        if (application.status !== ApplicationStatus.DRAFT) {
          throw new ConflictException('Already applied for this job');
        }
        replacedResumeFileId =
          application.resumeFileId !== input.resumeFileId
            ? application.resumeFileId
            : null;
        replacedCoverLetterFileId =
          application.coverLetterFileId &&
          application.coverLetterFileId !== input.coverLetterFileId
            ? application.coverLetterFileId
            : null;

        application.resumeFileId = input.resumeFileId;
        application.coverLetterFileId = input.coverLetterFileId;
        application.updatedAt = now;

        if (application.status === ApplicationStatus.DRAFT && !input.isDraft) {
          application.status = ApplicationStatus.APPLIED;
          application.appliedAt = now;
          this.recordHistory(
            txEm,
            application.id,
            ApplicationStatus.DRAFT,
            ApplicationStatus.APPLIED,
            null,
            input.candidateId,
          );
        }
      } else {
        application = applicationRepository.create({
          id: randomUUID(),
          candidateId: input.candidateId,
          jobId: input.jobId,
          resumeFileId: input.resumeFileId,
          coverLetterFileId: input.coverLetterFileId,
          status: input.isDraft
            ? ApplicationStatus.DRAFT
            : ApplicationStatus.APPLIED,
          appliedAt: input.isDraft ? null : now,
          withdrawnAt: null,
          createdAt: now,
          updatedAt: now,
        });
        txEm.persist(application);
        await txEm.flush();
        this.recordHistory(
          txEm,
          application.id,
          null,
          application.status,
          null,
          input.candidateId,
        );
      }

      if (
        !input.isDraft &&
        input.updateProfileResume &&
        input.uploadedResumeId
      ) {
        const candidate = await txEm.findOneOrFail(CandidateSchema, {
          id: input.candidateId,
        });
        if (candidate.resumeFileId !== input.uploadedResumeId) {
          previousProfileResumeId = candidate.resumeFileId ?? null;
          candidate.resumeFileId = input.uploadedResumeId;
          candidate.updatedAt = now;
        }
      }

      await txEm.flush();

      return {
        applicationId: application.id,
        replacedResumeFileId,
        replacedCoverLetterFileId,
        previousProfileResumeId,
      };
    });
  }

  private recordHistory(
    em: EntityManager,
    applicationId: string,
    oldStatus: ApplicationStatus | null,
    newStatus: ApplicationStatus,
    reason: string | null,
    changedBy: string,
  ): void {
    const history = em.create(ApplicationStatusHistorySchema, {
      applicationId,
      oldStatus,
      newStatus,
      reason,
      changedBy,
      createdAt: new Date(),
    });
    em.persist(history);
  }

  /**
   * Deletes files that the new application no longer uses, but never removes
   * the candidate's current profile resume or a file another row references.
   */
  private async cleanupReplacedFiles(
    result: PersistResult,
    candidateId: string,
  ): Promise<void> {
    try {
      const candidate = await this.candidatesService.findOne({
        id: candidateId,
      });
      const protectedFileId = candidate.resumeFileId ?? null;
      const candidates = [
        ...new Set(
          [
            result.replacedResumeFileId,
            result.replacedCoverLetterFileId,
            result.previousProfileResumeId,
          ].filter(
            (fileId): fileId is string =>
              Boolean(fileId) && fileId !== protectedFileId,
          ),
        ),
      ];

      await Promise.allSettled(
        candidates.map((fileId) =>
          this.filesService.removeIfUnreferenced(fileId),
        ),
      );
    } catch {
      // Cleanup is best-effort; the application was already committed.
    }
  }

  private async cleanupCreatedFiles(fileIds: string[]): Promise<void> {
    await Promise.allSettled(
      fileIds.map((fileId) => this.filesService.removeIfUnreferenced(fileId)),
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (error instanceof UniqueConstraintViolationException) {
    return true;
  }
  if (!(error instanceof DriverException)) {
    return false;
  }
  return error.code === '23505';
}
