/**
 * Shared Mongo query builders for Holidaysera property list + bulk actions.
 * isLive is Boolean in property.ts; treat anything not strictly true as not live.
 */
export function buildPropertyListQuery(
  searchTerm: string,
  searchType: string,
  holidayseraOnly: boolean,
): Record<string, unknown> {
  let query: Record<string, unknown> = {};

  if (searchTerm.trim()) {
    query[searchType] = new RegExp(searchTerm.trim(), "i");
  }

  if (holidayseraOnly) {
    const holidayseraFilter = { origin: { $regex: /holidaysera/i } };
    if (Object.keys(query).length > 0) {
      query = { $and: [query, holidayseraFilter] };
    } else {
      query = holidayseraFilter;
    }
  }

  return query;
}

export function buildNotLiveQuery(
  baseQuery: Record<string, unknown>,
): Record<string, unknown> {
  const notLiveFilter = { isLive: { $ne: true } };

  if (Object.keys(baseQuery).length === 0) {
    return notLiveFilter;
  }

  return { $and: [baseQuery, notLiveFilter] };
}
