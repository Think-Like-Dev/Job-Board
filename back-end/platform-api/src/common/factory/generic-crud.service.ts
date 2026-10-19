import {
  EntityRepository,
  FilterQuery,
  FindOptions,
  Loaded,
  RequiredEntityData,
} from '@mikro-orm/core';
import { NotFoundException } from '@nestjs/common';
import { IPaginatedResult } from '@common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

/**
 * Reusable base CRUD service. Extend it per module with the entity type.
 * Standard list/create/get/update/remove flows live here (DRY), while
 * modules add their own business methods.
 *
 * Written against the MikroORM v7 API: there are no `*AndFlush` helpers —
 * call `persist()`/`remove()` on the entity manager and then `flush()`.
 */
export abstract class GenericCrudService<Entity extends object> {
  constructor(protected readonly repository: EntityRepository<Entity>) {}

  async create(
    data: RequiredEntityData<Entity> | RequiredEntityData<Entity>[],
  ): Promise<Entity> {
    const entity = this.repository.create(data as any);
    const em = this.repository.getEntityManager();
    em.persist(entity);
    await em.flush();
    return entity;
  }

  async findAllPaginated(
    query: PaginationQueryDto,
    where: FilterQuery<Entity> = {},
    options: FindOptions<Entity> = {},
  ): Promise<IPaginatedResult<Entity>> {
    const currentPage = query.page;
    const itemsPerPage = query.limit;

    // `findAndCount`'s v7 `IndexName<Entity>` generic can't be resolved from a
    // bare `FilterQuery<Entity>` in a generic base class, so cast is required.
    const [items, totalItems] = await this.repository.findAndCount(
      where as any, // eslint-disable-line @typescript-eslint/no-unsafe-argument
      {
        ...options,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      },
    );

    return {
      data: items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage,
        totalPages: Math.ceil(totalItems / itemsPerPage),
        currentPage,
      },
    };
  }

  async findOne(
    where: FilterQuery<Entity>,
    options?: FindOptions<Entity>,
  ): Promise<Entity> {
    // Same v7 `IndexName<Entity>` generic limitation as `findAndCount` above.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const entity = await this.repository.findOne(where as any, options);
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }
    return entity;
  }

  async update<P extends string = never>(
    where: FilterQuery<Entity>,
    data: Partial<RequiredEntityData<Entity>>,
  ): Promise<Loaded<Entity, P>> {
    const entity = await this.repository.findOne(where);
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }
    this.repository.assign(entity, data as any);
    await this.repository.getEntityManager().flush();
    return entity as Loaded<Entity, P>;
  }

  async remove(where: FilterQuery<Entity>): Promise<boolean> {
    const entity = await this.repository.findOne(where);
    if (!entity) {
      throw new NotFoundException('Resource not found');
    }
    const em = this.repository.getEntityManager();
    em.remove(entity);
    await em.flush();
    return true;
  }
}
