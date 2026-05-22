/** Radix Select cannot use empty string as value; map unset floor to this sentinel. */
export const OWNER_FLOOR_UNSET = "floor-unset";

export const OWNER_PROPERTY_FLOOR_VALUES = [
  ...Array.from({ length: 3 }, (_, i) => String(i - 3)),
  ...Array.from({ length: 10 }, (_, i) => String(i + 1)),
  "Mezzanine",
  "ground-floor",
  "basement",
  "semi-basement",
] as const;

function propertyFloorOptionLabel(value: string): string {
  if (value === "ground-floor") return "Ground floor";
  if (value === "semi-basement") return "Semi-basement";
  return value;
}

export function isValidOwnerPropertyFloor(value: string): boolean {
  return (
    value === "" ||
    (OWNER_PROPERTY_FLOOR_VALUES as readonly string[]).includes(value)
  );
}

const propertyFloorSelectOptions = OWNER_PROPERTY_FLOOR_VALUES.map((value) => ({
  label: propertyFloorOptionLabel(value),
  value,
}));

/** Add-listing floor select (required; no unset option). */
export const listingPropertyFloorSelectOptions = propertyFloorSelectOptions;

export const ownerPropertyFloorSelectOptions: { label: string; value: string }[] = [
  { label: "—", value: OWNER_FLOOR_UNSET },
  ...propertyFloorSelectOptions,
];

export function ownerPropertyFloorToSelectValue(stored: string | undefined): string {
  if (!stored || stored.trim() === "") return OWNER_FLOOR_UNSET;
  return stored;
}

export function ownerPropertyFloorFromSelectValue(selected: string): string {
  if (selected === OWNER_FLOOR_UNSET) return "";
  return selected;
}
