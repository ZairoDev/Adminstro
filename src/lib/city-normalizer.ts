export const normalizeCityKey = (city: string): string =>
  city.trim().replace(/\s+/g, " ").toLowerCase();

export const toDisplayCity = (city: string): string =>
  city.trim().replace(/\s+/g, " ");

export const dedupeCities = (cities: string[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const city of cities) {
    const display = toDisplayCity(city);  
    if (!display) continue;
    
    const key = normalizeCityKey(display);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(display);
  }

  return deduped;
};
