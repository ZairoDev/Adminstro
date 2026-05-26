import { MonthlyTarget } from "@/models/monthlytarget";
import {
  dedupeCities,
  normalizeCityKey,
  toDisplayCity,
} from "@/lib/city-normalizer";

/** Active base cities from MonthlyTarget (same source as /api/monthlyTargets/getLocations). */
export async function getMonthlyTargetCities(): Promise<string[]> {
  const rows = await MonthlyTarget.find({
    month: { $exists: false },
    isActive: { $ne: false },
  })
    .select("city")
    .lean();

  return dedupeCities(rows.map((row) => toDisplayCity(row.city || "")));
}

export async function getMonthlyTargetCityKeySet(): Promise<Set<string>> {
  const cities = await getMonthlyTargetCities();
  return new Set(cities.map((city) => normalizeCityKey(city)));
}

/**
 * Resolve display names to MonthlyTarget canonical labels (case-insensitive).
 * Returns invalid names that are not in MonthlyTarget.
 */
export async function resolveLocationsAgainstMonthlyTargets(
  locationInputs: string[]
): Promise<{
  resolved: Array<{ displayName: string; locationKey: string }>;
  invalid: string[];
}> {
  const cities = await getMonthlyTargetCities();
  const byKey = new Map(
    cities.map((city) => [normalizeCityKey(city), city] as const)
  );

  const resolved: Array<{ displayName: string; locationKey: string }> = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const raw of locationInputs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeCityKey(trimmed);
    const canonical = byKey.get(key);
    if (!canonical) {
      invalid.push(trimmed);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push({ displayName: canonical, locationKey: key });
  }

  return { resolved, invalid };
}
