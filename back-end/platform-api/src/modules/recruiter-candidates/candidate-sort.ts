import { BadRequestException } from '@nestjs/common';
import { QueryOrder, type FindOptions } from '@mikro-orm/core';
import type { Candidate } from '@modules/candidates/candidate.schema';

const COLUMNS = {
  createdAt: 'createdAt',
  experience: 'totalExperienceMonths',
} as const;

const DIRECTIONS = ['ASC', 'DESC'] as const;
type SortDirection = (typeof DIRECTIONS)[number];

/**
 * Parses `sortBy=field:direction`. Only the whitelisted candidate columns are
 * accepted, so a query string can never become an arbitrary SQL ordering.
 */
export function parseCandidateSort(
  sortBy: string | undefined,
): FindOptions<Candidate>['orderBy'] {
  if (!sortBy) {
    return { createdAt: QueryOrder.DESC };
  }

  const [field, direction] = sortBy.split(':');
  const column = COLUMNS[field as keyof typeof COLUMNS];

  if (!column || !DIRECTIONS.includes(direction as SortDirection)) {
    throw new BadRequestException(
      'Invalid sortBy. Allowed values: createdAt:ASC, createdAt:DESC, experience:ASC, experience:DESC',
    );
  }

  return {
    [column]: direction === 'ASC' ? QueryOrder.ASC : QueryOrder.DESC,
  };
}
