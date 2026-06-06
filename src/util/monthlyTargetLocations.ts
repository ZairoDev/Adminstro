/** Normalize /api/monthlyTargets/getLocations `locations` payload to display names. */
export function parseMonthlyTargetLocationNames(locations: unknown): string[] {
  if (!Array.isArray(locations)) return [];

  return locations
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "city" in item) {
        return String((item as { city?: unknown }).city ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}
