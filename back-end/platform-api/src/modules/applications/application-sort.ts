import { BadRequestException } from '@nestjs/common';
import { QueryOrder, type FindOptions } from '@mikro-orm/core';
import type { Application } from './application.schema';

const SORTABLE_FIELDS = ['appliedAt', 'createdAt'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

const DIRECTIONS = ['ASC', 'DESC'] as const;
type SortDirection = (typeof DIRECTIONS)[number];

/**
 * Parses `sortBy=field:direction` into a MikroORM order clause. Only the
 * whitelisted application columns are accepted, so a query string can never
 * become an arbitrary SQL ordering.
 */
export function parseApplicationSort(
  sortBy: string | undefined,
  fallbackField: SortableField,
): FindOptions<Application>['orderBy'] {
  if (!sortBy) {
    return { [fallbackField]: QueryOrder.DESC };
  }

  const [field, direction] = sortBy.split(':');
  if (
    !SORTABLE_FIELDS.includes(field as SortableField) ||
    !DIRECTIONS.includes(direction as SortDirection)
  ) {
    const allowed = SORTABLE_FIELDS.flatMap((sortable) =>
      DIRECTIONS.map((order) => `${sortable}:${order}`),
    ).join(', ');
    throw new BadRequestException(`sortBy must be one of: ${allowed}`);
  }

  return {
    [field]: direction === 'ASC' ? QueryOrder.ASC : QueryOrder.DESC,
  };
}
