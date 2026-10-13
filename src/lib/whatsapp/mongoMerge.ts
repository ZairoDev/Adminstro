/**
 * Safe Mongo filter composition.
 *
 * Visibility filters (phone / location / rental / channel / admin queue) own
 * the top-level `$or`. Any additional predicate (search, labels, ...) must be
 * ANDed in so it can never overwrite a visibility clause.
 */

export type MongoFilter = Record<string, unknown>;

/** Returns a copy of `filter` with `clause` appended to `$and`. */
export function andMerge(filter: MongoFilter, clause: MongoFilter | null | undefined): MongoFilter {
  if (!clause || Object.keys(clause).length === 0) return { ...filter };
  const existing = Array.isArray(filter.$and) ? (filter.$and as MongoFilter[]) : [];
  return { ...filter, $and: [...existing, clause] };
}

/** True when a visibility filter denies everything (`{ _id: null }` sentinel). */
export function isDenyAllFilter(filter: MongoFilter): boolean {
  return "_id" in filter && filter._id === null;
}
