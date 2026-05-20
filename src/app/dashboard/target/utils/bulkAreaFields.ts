import type { BulkAreaRow } from "./bulkAreaParser";

/** Canonical field keys used by the Area model / upload API */
export const FULL_BULK_CANONICAL_FIELDS = [
  "country",
  "city",
  "name",
  "zone",
  "metroZone",
  "subUrban",
  "town",
  "village",
  "municipality",
  "district",
  "districtOf",
  "extension",
  "tram",
  "subway",
  "studio",
  "sharedApartment",
  "oneBhk",
  "twoBhk",
  "threeBhk",
] as const;

export type FullBulkCanonicalField = (typeof FULL_BULK_CANONICAL_FIELDS)[number];

export const FULL_BULK_REQUIRED_FIELDS: FullBulkCanonicalField[] = [
  "country",
  "city",
  "name",
];

/** Header text (any case/spacing) → canonical field */
const HEADER_TO_CANONICAL: Record<string, FullBulkCanonicalField> = {
  country: "country",
  city: "city",
  name: "name",
  area: "name",
  "area name": "name",
  areaname: "name",
  zone: "zone",
  metrozone: "metroZone",
  "metro zone": "metroZone",
  metro_zone: "metroZone",
  suburban: "subUrban",
  "sub urban": "subUrban",
  sub_urban: "subUrban",
  town: "town",
  village: "village",
  municipality: "municipality",
  district: "district",
  districtof: "districtOf",
  "district of": "districtOf",
  district_of: "districtOf",
  extension: "extension",
  tram: "tram",
  subway: "subway",
  studio: "studio",
  sharedapartment: "sharedApartment",
  "shared apartment": "sharedApartment",
  shared_apartment: "sharedApartment",
  onebhk: "oneBhk",
  "1bhk": "oneBhk",
  "1 bhk": "oneBhk",
  twobhk: "twoBhk",
  "2bhk": "twoBhk",
  "2 bhk": "twoBhk",
  threebhk: "threeBhk",
  "3bhk": "threeBhk",
  "3 bhk": "threeBhk",
};

function normalizeHeaderKey(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapHeaderToCanonical(header: string): FullBulkCanonicalField | null {
  const key = normalizeHeaderKey(header);
  if (HEADER_TO_CANONICAL[key]) return HEADER_TO_CANONICAL[key];
  const compact = key.replace(/\s/g, "");
  if (HEADER_TO_CANONICAL[compact]) return HEADER_TO_CANONICAL[compact];
  return null;
}

export function buildCanonicalHeaderMap(
  headers: string[],
): Map<string, FullBulkCanonicalField> {
  const map = new Map<string, FullBulkCanonicalField>();
  for (const h of headers) {
    const canonical = mapHeaderToCanonical(h);
    if (canonical) map.set(h, canonical);
  }
  return map;
}

/** Rows keyed by canonical field names (case-insensitive header matching). */
export function normalizeBulkRows(
  headers: string[],
  rows: BulkAreaRow[],
): { rows: BulkAreaRow[]; headerMap: Map<string, FullBulkCanonicalField> } {
  const headerMap = buildCanonicalHeaderMap(headers);
  const normalized = rows.map((row) => {
    const out: BulkAreaRow = {};
    for (const [header, value] of Object.entries(row)) {
      const canonical = headerMap.get(header);
      if (canonical) {
        out[canonical] = value;
      }
    }
    return out;
  });
  return { rows: normalized, headerMap };
}

export function getCanonicalRowValue(row: BulkAreaRow, field: string): string {
  if (row[field] !== undefined) return String(row[field] ?? "").trim();
  const lower = field.toLowerCase();
  for (const [k, v] of Object.entries(row)) {
    if (k.toLowerCase() === lower) return String(v ?? "").trim();
  }
  return "";
}

export function getMissingRequiredCanonicalFields(
  headers: string[],
): FullBulkCanonicalField[] {
  const mapped = new Set(
    headers.map((h) => mapHeaderToCanonical(h)).filter(Boolean),
  );
  return FULL_BULK_REQUIRED_FIELDS.filter((f) => !mapped.has(f));
}

/** Columns shown in preview (avoids wide horizontal scroll). */
export const FULL_BULK_PREVIEW_COLUMNS: {
  field: FullBulkCanonicalField;
  label: string;
}[] = [
  { field: "country", label: "Country" },
  { field: "city", label: "City" },
  { field: "name", label: "Name" },
  { field: "zone", label: "Zone" },
  { field: "metroZone", label: "Metro" },
  { field: "studio", label: "Studio" },
  { field: "oneBhk", label: "1 BHK" },
];

export const FULL_BULK_PREVIEW_ROW_LIMIT = 50;
