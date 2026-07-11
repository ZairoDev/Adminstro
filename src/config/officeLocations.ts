/** Preferred office locations shown on the public application form. */
export const OFFICE_LOCATIONS = [
  "Kanpur",
  "Noida",
] as const;

export type OfficeLocation = (typeof OFFICE_LOCATIONS)[number];
