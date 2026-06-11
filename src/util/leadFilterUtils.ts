import type { FilterState } from "@/components/lead-component/NewLeadFilter";

export const QUICK_PROPERTY_FILTER_KEYS = [
  "1-bedroom",
  "2-bedroom",
  "3-bedroom",
  "4-bedroom",
  "studio",
  "shared-apartment",
] as const;

export type QuickPropertyFilterKey = (typeof QUICK_PROPERTY_FILTER_KEYS)[number];

const STUDIO_TYPES = ["Studio", "Studio / 1 bedroom"] as const;

export function bedroomTypeLabel(beds: number): string {
  return `${beds} Bedroom`;
}

/** Match leads stored as "2 Bedroom" OR legacy Apartment + noOfBeds */
export function buildBedroomFilterClause(
  beds: number,
): Record<string, unknown> {
  return {
    $or: [
      { typeOfProperty: bedroomTypeLabel(beds) },
      { typeOfProperty: "Apartment", noOfBeds: beds },
    ],
  };
}

/** Mongo aggregation expression for counting a bedroom bucket */
export function buildBedroomMatchExpression(beds: number): Record<string, unknown> {
  return {
    $or: [
      { $eq: ["$typeOfProperty", bedroomTypeLabel(beds)] },
      {
        $and: [
          { $eq: ["$typeOfProperty", "Apartment"] },
          { $eq: ["$noOfBeds", beds] },
        ],
      },
    ],
  };
}

export function buildWordsCountGroupFields(): Record<string, unknown> {
  const bedroomField = (key: string, beds: number) => ({
    [key]: {
      $sum: {
        $cond: [buildBedroomMatchExpression(beds), 1, 0],
      },
    },
  });

  return {
    _id: null,
    ...bedroomField("1bhk", 1),
    ...bedroomField("2bhk", 2),
    ...bedroomField("3bhk", 3),
    ...bedroomField("4bhk", 4),
    studio: {
      $sum: {
        $cond: [{ $in: ["$typeOfProperty", STUDIO_TYPES] }, 1, 0],
      },
    },
    sharedApartment: {
      $sum: {
        $cond: [{ $eq: ["$typeOfProperty", "Shared Apartment"] }, 1, 0],
      },
    },
  };
}

export function stripQuickPropertyFiltersFromQuery(
  query: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...query };
  if (!Array.isArray(result.$and)) return result;

  const filtered = (result.$and as Record<string, unknown>[]).filter(
    (clause) => {
      const orList = clause.$or;
      if (!Array.isArray(orList)) return true;
      return !orList.some(
        (item) =>
          item &&
          typeof item === "object" &&
          ("typeOfProperty" in item || "noOfBeds" in item),
      );
    },
  );

  if (filtered.length > 0) {
    result.$and = filtered;
  } else {
    delete result.$and;
  }

  return result;
}

export function normalizeArea(area: string | undefined | null): string {
  if (!area || area === "all") return "";
  return area;
}

export function mergeLeadFilters(
  filters: FilterState,
  area: string,
): FilterState {
  return { ...filters, allotedArea: normalizeArea(area) };
}

export function buildQuickPropertyFilterQuery(
  selected: string[],
): Record<string, unknown>[] {
  const clauses: Record<string, unknown>[] = [];

  for (const key of selected) {
    switch (key) {
      case "1-bedroom":
        clauses.push(buildBedroomFilterClause(1));
        break;
      case "2-bedroom":
        clauses.push(buildBedroomFilterClause(2));
        break;
      case "3-bedroom":
        clauses.push(buildBedroomFilterClause(3));
        break;
      case "4-bedroom":
        clauses.push(buildBedroomFilterClause(4));
        break;
      case "studio":
        clauses.push({
          typeOfProperty: { $in: [...STUDIO_TYPES] },
        });
        break;
      case "shared-apartment":
        clauses.push({ typeOfProperty: "Shared Apartment" });
        break;
      default:
        break;
    }
  }

  return clauses;
}

export function applyQuickPropertyFiltersToQuery(
  query: Record<string, unknown>,
  quickPropertyFilters: string[] | undefined,
): void {
  if (!quickPropertyFilters?.length) return;

  const clauses = buildQuickPropertyFilterQuery(quickPropertyFilters);
  if (!clauses.length) return;

  const andList = Array.isArray(query.$and)
    ? (query.$and as Record<string, unknown>[])
    : [];
  query.$and = [...andList, { $or: clauses }];
}
