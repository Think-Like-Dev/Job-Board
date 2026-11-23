import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  QueryOrder,
  UniqueConstraintViolationException,
} from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/postgresql';
import { JobsService } from '@modules/jobs/jobs.service';
import type { Job } from '@modules/jobs/job.schema';
import { markDeleted, markRestored } from '@common/persistence/soft-delete';
import {
  CandidateBookmark,
  CandidateBookmarkSchema,
} from './candidate-bookmark.schema';

@Injectable()
export class BookmarksService {
  constructor(
    @InjectRepository(CandidateBookmarkSchema)
    private readonly repository: EntityRepository<CandidateBookmark>,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Saved jobs, newest first. Jobs that are no longer published/open are
   * hidden so the Saved Jobs tab never links to an unavailable job.
   */
  async list(candidateId: string): Promise<Job[]> {
    const bookmarks = await this.repository.find(
      { candidateId },
      { orderBy: { createdAt: QueryOrder.DESC } },
    );
    if (!bookmarks.length) {
      return [];
    }

    const jobs = await this.jobsService.findPublicJobsByIds(
      bookmarks.map((bookmark) => bookmark.jobId),
    );
    const jobsById = new Map(jobs.map((job) => [job.id, job]));

    return bookmarks
      .map((bookmark) => jobsById.get(bookmark.jobId))
      .filter((job): job is Job => Boolean(job));
  }

  /** Idempotent: saving an already-saved job succeeds without a duplicate. */
  async add(candidateId: string, jobId: string): Promise<void> {
    await this.jobsService.findJobById(jobId, { publicOnly: true });

    const em = this.repository.getEntityManager();
    // Include soft-deleted rows: re-saving a removed bookmark revives it, which
    // keeps the (candidate, job) pair unique among live rows.
    const existing = await this.repository.findOne(
      { candidateId, jobId },
      { filters: false },
    );

    if (existing) {
      if (existing.deletedAt) {
        markRestored(existing);
        await em.flush();
      }
      return;
    }

    const bookmark = this.repository.create({
      candidateId,
      jobId,
      createdAt: new Date(),
    });

    try {
      em.persist(bookmark);
      await em.flush();
    } catch (error) {
      // A concurrent request may have inserted the same pair.
      if (!(error instanceof UniqueConstraintViolationException)) {
        throw error;
      }
    }
  }

  /** Idempotent: removing a job that is not saved is a no-op. */
  async remove(candidateId: string, jobId: string): Promise<void> {
    const bookmark = await this.repository.findOne({ candidateId, jobId });
    if (!bookmark) {
      return;
    }

    markDeleted(bookmark);
    await this.repository.getEntityManager().flush();
  }
}
