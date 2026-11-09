import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import {
  QueryOrder,
  DriverException,
  ForeignKeyConstraintViolationException,
  type FilterQuery,
  type Loaded,
  type RequiredEntityData,
} from '@mikro-orm/core';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { FileOwnerType, FileType } from '@common/constants/enums';
import type { SessionPayload } from '@modules/auth/auth.service';
import { File, FileSchema } from './file.schema';
import { FileAccessGrantsService } from './file-access-grants.service';
import { canMutateFile, canReadFile, canReadSharedFile } from './files.access';
import { assertUploadMatchesType } from './file-validation';
import { S3StorageService, type StoredObject } from './s3-storage.service';

/** Single-bucket path prefixes, one folder per file kind. */
const FILE_PREFIXES: Record<FileType, string> = {
  [FileType.RESUME]: 'resumes',
  [FileType.COVER_LETTER]: 'cover-letters',
  [FileType.OFFER_LETTER]: 'offer-letters',
  [FileType.PROFILE_IMAGE]: 'profile-images',
  [FileType.CERTIFICATION]: 'certifications',
  [FileType.OTHER]: 'other',
};

type SessionContext = Pick<SessionPayload, 'principalType' | 'principalId'>;

/** A file plus its open object stream, ready to be piped to a response. */
export interface FileContent {
  file: File;
  object: StoredObject;
}

@Injectable()
export class FilesService extends GenericCrudService<File> {
  constructor(
    @InjectRepository(FileSchema)
    repository: EntityRepository<File>,
    private readonly storage: S3StorageService,
    private readonly grants: FileAccessGrantsService,
  ) {
    super(repository);
  }

  /**
   * Uploads the binary to Garage and persists the metadata row. The owner is
   * always taken from the authenticated session, never from client input.
   */
  async registerAndUpload(
    file: Express.Multer.File,
    fileType: FileType,
    session: SessionContext,
  ): Promise<File> {
    return this.persistUpload(
      file,
      fileType,
      this.ownerTypeFor(session),
      session.principalId,
    );
  }

  /**
   * Recruiter-created candidate documents. The candidate is the owner even
   * though an internal user uploaded the file, so the candidate can later
   * replace/delete it and reuse it as the central resume when applying.
   * The candidate row may not exist yet; `files.owner_id` is polymorphic and
   * the caller supplies the generated candidate UUID.
   */
  async registerAndUploadForCandidate(
    file: Express.Multer.File,
    fileType: FileType,
    candidateId: string,
  ): Promise<File> {
    if (!candidateId) {
      throw new BadRequestException('Candidate id is required');
    }

    return this.persistUpload(
      file,
      fileType,
      FileOwnerType.CANDIDATE,
      candidateId,
    );
  }

  private async persistUpload(
    file: Express.Multer.File,
    fileType: FileType,
    ownerType: FileOwnerType,
    ownerId: string,
  ): Promise<File> {
    assertUploadMatchesType(file, fileType);

    if (!file?.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const extension = extname(file.originalname).toLowerCase();
    const key = `${FILE_PREFIXES[fileType] ?? 'other'}/${randomUUID()}${extension}`;

    await this.storage.uploadFile(file.buffer, key, file.mimetype);

    return this.create({
      fileType,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: key,
      ownerType,
      ownerId,
      createdAt: new Date(),
    });
  }

  /**
   * Lists files visible to the session. Candidates see their own uploads plus
   * files explicitly shared with them; internal users see everything.
   */
  async listFiles(
    query: PaginationQueryDto,
    session: SessionContext,
  ): Promise<IPaginatedResult<File>> {
    const orderBy = { createdAt: QueryOrder.DESC };

    if (session.principalType === 'user') {
      return this.findAllPaginated(query, {}, { orderBy });
    }

    const ownFiles: FilterQuery<File> = {
      ownerType: FileOwnerType.CANDIDATE,
      ownerId: session.principalId,
    };
    const sharedFileIds = await this.grants.listFileIdsForCandidate(
      session.principalId,
    );

    const where: FilterQuery<File> =
      sharedFileIds.length === 0
        ? ownFiles
        : { $or: [ownFiles, { id: { $in: sharedFileIds } }] };

    return this.findAllPaginated(query, where, { orderBy });
  }

  /** Loads a file after checking that the session may read it. */
  async findFileForSession(id: string, session: SessionContext): Promise<File> {
    const file = await this.findOne({ id });
    await this.assertCanRead(file, session);
    return file;
  }

  /**
   * Loads a file that a candidate references as one of their own uploads.
   * Guards against attaching another candidate's file to an application.
   */
  async findCandidateFile(
    id: string,
    candidateId: string,
    expectedType?: FileType,
  ): Promise<File> {
    const file = await this.findOne({ id });

    if (
      file.ownerType !== FileOwnerType.CANDIDATE ||
      file.ownerId !== candidateId
    ) {
      throw new BadRequestException('File does not belong to the candidate');
    }

    if (expectedType && file.fileType !== expectedType) {
      throw new BadRequestException(
        `File is not a ${expectedType.toLowerCase().replace('_', ' ')}`,
      );
    }

    return file;
  }

  /**
   * Opens the stored object for streaming. Bytes travel through the API so
   * every read is covered by the session cookie; no public object URL is
   * handed to the browser.
   */
  async openFileForSession(
    id: string,
    session: SessionContext,
  ): Promise<FileContent> {
    const file = await this.findFileForSession(id, session);

    if (!file.storagePath) {
      throw new BadRequestException('File has no stored object');
    }

    const object = await this.storage.getFile(file.storagePath);

    return { file, object };
  }

  /** Deletes a file only when the session principal owns it. */
  async removeForSession(
    id: string,
    session: SessionContext,
  ): Promise<boolean> {
    const file = await this.findOne({ id });
    this.assertCanMutate(file, session);
    return this.remove({ id });
  }

  /**
   * Deletes the metadata row first so FK restrictions protect files that are
   * still referenced by applications or candidates, then removes the object
   * from Garage. This avoids dangling metadata pointing at a missing object.
   */
  override async remove(where: FilterQuery<File>): Promise<boolean> {
    const file = await this.findOne(where);
    const storagePath = file.storagePath;

    // JSONB profile snapshots have no FK to files, so their document ids must
    // be checked explicitly before deleting the metadata row.
    if (await this.isReferencedByProfileSnapshot(file.id)) {
      throw new ConflictException(
        'File is still referenced and cannot be deleted',
      );
    }

    const em = this.repository.getEntityManager();
    em.remove(file);

    try {
      await em.flush();
    } catch (error) {
      if (isReferenceViolation(error)) {
        throw new ConflictException(
          'File is still referenced and cannot be deleted',
        );
      }
      throw error;
    }

    if (storagePath) {
      await this.storage.deleteFile(storagePath);
    }

    return true;
  }

  private async isReferencedByProfileSnapshot(
    fileId: string,
  ): Promise<boolean> {
    const em = this.repository.getEntityManager();
    const rows = (await em.getConnection().execute(
      `select exists (
         select 1
           from "candidate_profile_versions"
          where jsonb_exists("profile_data" -> 'documentFileIds', ?)
       ) as "exists"`,
      [fileId],
    )) as Array<{ exists: boolean }>;

    return Boolean(rows[0]?.exists);
  }

  /**
   * Best-effort cleanup for files that may still be referenced elsewhere.
   * Returns false instead of throwing when another row protects the file.
   */
  async removeIfUnreferenced(id: string): Promise<boolean> {
    try {
      return await this.remove({ id });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Keeps storage in sync when a metadata row's `storagePath` changes: the
   * previous object is removed after the row update succeeds.
   */
  override async update<P extends string = never>(
    where: FilterQuery<File>,
    data: Partial<RequiredEntityData<File>>,
  ): Promise<Loaded<File, P>> {
    const existing = await this.findOne(where);
    const previousStoragePath = existing.storagePath;
    const nextStoragePath = (data as Partial<File>).storagePath;

    const updated = await super.update<P>(where, data);

    if (
      previousStoragePath &&
      nextStoragePath !== undefined &&
      nextStoragePath !== previousStoragePath
    ) {
      await this.storage.deleteFile(previousStoragePath);
    }

    return updated;
  }

  private ownerTypeFor(session: SessionContext): FileOwnerType {
    return session.principalType === 'candidate'
      ? FileOwnerType.CANDIDATE
      : FileOwnerType.USER;
  }

  private async assertCanRead(
    file: File,
    session: SessionContext,
  ): Promise<void> {
    if (canReadFile(file, session)) {
      return;
    }

    const granted = await this.grants.hasGrant(file.id, session.principalId);
    if (canReadSharedFile(session, granted)) {
      return;
    }

    throw new ForbiddenException('You do not have access to this file');
  }

  private assertCanMutate(file: File, session: SessionContext): void {
    if (!canMutateFile(file, session)) {
      throw new ForbiddenException('You do not have access to this file');
    }
  }
}

/**
 * PostgreSQL reports RESTRICT violations as `23001` and foreign-key
 * violations as `23503`. MikroORM only maps `23503` to a typed exception, so
 * both codes are checked before returning a 409.
 */
function isReferenceViolation(error: unknown): boolean {
  if (error instanceof ForeignKeyConstraintViolationException) {
    return true;
  }

  if (!(error instanceof DriverException)) {
    return false;
  }

  return error.code === '23001' || error.code === '23503';
}
