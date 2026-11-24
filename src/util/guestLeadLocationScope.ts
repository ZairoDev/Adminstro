import { escapeRegExp } from "@/util/regex";

/**
 * Same city match the area dropdown uses: case-insensitive substring.
 * An allotted city and an explicit "thessaloniki" filter must hit the same leads,
 * including values with extra spaces or surrounding text.
 */
export function leadAreaMatchRegex(area: string): RegExp {
  return new RegExp(escapeRegExp(area.trim()), "i");
}

const DEFAULT_LOCATION_EXEMPT_ROLES = [
  "SuperAdmin",
  "Sales-TeamLead",
  "LeadGen-TeamLead",
  "Advert",
];

export const ALL_LEADS_LOCATION_EXEMPT_ROLES = [
  "SuperAdmin",
  "Admin",
  "Developer",
  "HR",
  "Sales-TeamLead",
  "LeadGen-TeamLead",
  "LeadGen",
  "Advert",
] as const;

export function resolveEffectiveLeadLocations(options: {
  role: string;
  assignedArea: unknown;
  uiAllotedArea?: string;
  exemptRoles?: readonly string[];
}): string[] | null {
  const uiArea = String(options.uiAllotedArea ?? "").trim();
  if (uiArea) return [uiArea];

  const exempt = new Set(options.exemptRoles ?? DEFAULT_LOCATION_EXEMPT_ROLES);
  if (exempt.has(String(options.role))) return null;

  const areas = parseAssignedAreasFromToken(options.assignedArea);
  return areas.length > 0 ? areas : null;
}

export function parseAssignedAreasFromToken(assignedArea: unknown): string[] {
  if (assignedArea == null) return [];
  if (Array.isArray(assignedArea)) {
    return assignedArea.map((area) => String(area).trim()).filter(Boolean);
  }
  const single = String(assignedArea).trim();
  return single ? [single] : [];
}

export function applyGuestLeadLocationToQuery(
  query: Record<string, any>,
  options: {
    role: string;
    assignedArea: unknown;
    uiAllotedArea?: string;
    exemptRoles?: string[];
  },
): void {
  const exempt = new Set(options.exemptRoles ?? DEFAULT_LOCATION_EXEMPT_ROLES);
  const uiArea = String(options.uiAllotedArea ?? "").trim();

  if (uiArea) {
    query.location = leadAreaMatchRegex(uiArea);
    return;
  }

  if (exempt.has(String(options.role))) {
    return;
  }

  const areas = parseAssignedAreasFromToken(options.assignedArea);
  if (areas.length === 0) {
    return;
  }

  if (areas.length === 1) {
    query.location = leadAreaMatchRegex(areas[0]);
    return;
  }

  query.$or = areas.map((area) => ({
    location: leadAreaMatchRegex(area),
  }));
}
