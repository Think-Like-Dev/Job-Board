/**
 * Soft delete: the project rule is that every entity is removed by setting
 * `deleted_at`, never by deleting the row. The single exception is file
 * metadata, which is removed together with its Garage object.
 *
 * Two pieces make this automatic:
 *  - `softDeleteProperty` adds the column to an EntitySchema;
 *  - `softDeleteFilter` registers a default query filter that hides deleted
 *    rows from every `find`/`count`/`findOne` without extra `where` clauses.
 *
 * Queries that must see deleted rows (reviving a bookmark, re-adding a skill)
 * opt out with `{ filters: false }`.
 */
export interface SoftDeletable {
  deletedAt?: Date | null;
}

/** Property fragment to spread into an EntitySchema's `properties`. */
export const softDeleteProperty = {
  deletedAt: { type: 'datetime', nullable: true } as const,
};

/** Default filter to spread into an EntitySchema's `filters`. */
export const softDeleteFilter = {
  softDelete: {
    name: 'softDelete',
    cond: { deletedAt: null },
    default: true,
  },
} as const;

/** Marks an entity as deleted; the caller is responsible for flushing. */
export function markDeleted(
  entity: SoftDeletable,
  at: Date = new Date(),
): void {
  entity.deletedAt = at;
}

/** Brings a previously deleted entity back. */
export function markRestored(entity: SoftDeletable): void {
  entity.deletedAt = null;
}
