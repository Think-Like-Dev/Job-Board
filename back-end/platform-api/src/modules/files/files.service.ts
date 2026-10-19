import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { GenericCrudService } from '@common/factory/generic-crud.service';
import { File, FileSchema } from './file.schema';

@Injectable()
export class FilesService extends GenericCrudService<File> {
  constructor(
    @InjectRepository(FileSchema)
    repository: EntityRepository<File>,
  ) {
    super(repository);
  }

  /** Registers a file's metadata after an upload is persisted to storage. */
  async register(data: Partial<File>): Promise<File> {
    return this.create({
      ...data,
      createdAt: new Date(),
    });
  }
}
