/** Radix Select cannot use empty string as value; map unset floor to this sentinel. */
export const OWNER_FLOOR_UNSET = "floor-unset";

export const ownerPropertyFloorSelectOptions: { label: string; value: string }[] = [
  { label: "—", value: OWNER_FLOOR_UNSET },
  ...Array.from({ length: 10 }, (_, i) => ({
    label: String(i + 1),
    value: String(i + 1),
  })),
  { label: "Mezzanine", value: "Mezzanine" },
];

export function ownerPropertyFloorToSelectValue(stored: string | undefined): string {
  if (!stored || stored.trim() === "") return OWNER_FLOOR_UNSET;
  return stored;
}

export function ownerPropertyFloorFromSelectValue(selected: string): string {
  if (selected === OWNER_FLOOR_UNSET) return "";
  return selected;
}
