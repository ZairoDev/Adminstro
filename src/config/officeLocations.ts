/**
 * @deprecated Prefer DB-backed OfficeAddress via /api/office-addresses.
 * Kept for reference / migration of legacy string officeLocation values.
 */
export const OFFICE_LOCATIONS = [
  "Kanpur",
  "Noida",
] as const;

export type OfficeLocation = (typeof OFFICE_LOCATIONS)[number];
