export interface GeocodeCoordinates {
  lat: number;
  lng: number;
}

interface NominatimSearchResult {
  lat?: string;
  lon?: string;
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_DELAY_MS = 1100;
const DEFAULT_MAX_RETRIES = 3;

const geocodeCache = new Map<string, GeocodeCoordinates | null>();
let lastRequestAt = 0;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

async function waitForRateLimit(delayMs: number): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < delayMs) {
    await delay(delayMs - elapsed);
  }
}

function parseCoordinates(result: NominatimSearchResult | undefined): GeocodeCoordinates | null {
  if (!result?.lat || !result?.lon) {
    return null;
  }

  const lat = Number(result.lat);
  const lng = Number(result.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

export async function geocodeWithNominatim(
  query: string,
  options?: {
    userAgent?: string;
    delayMs?: number;
    maxRetries?: number;
    countryCodes?: string[];
  },
): Promise<GeocodeCoordinates | null> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return null;
  }

  if (geocodeCache.has(normalized)) {
    return geocodeCache.get(normalized) ?? null;
  }

  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const userAgent = options?.userAgent ?? "admin-property-migration/1.0";
  const countryCodes = options?.countryCodes?.join(",");

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    await waitForRateLimit(delayMs);
    lastRequestAt = Date.now();

    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    if (countryCodes) {
      url.searchParams.set("countrycodes", countryCodes);
    }

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
        },
      });
    } catch {
      if (attempt < maxRetries) {
        await delay(delayMs * attempt);
        continue;
      }
      geocodeCache.set(normalized, null);
      return null;
    }

    if (response.status === 429) {
      await delay(delayMs * attempt);
      continue;
    }

    if (!response.ok) {
      if (response.status >= 500 && attempt < maxRetries) {
        await delay(delayMs * attempt);
        continue;
      }
      geocodeCache.set(normalized, null);
      return null;
    }

    const payload = (await response.json()) as NominatimSearchResult[];
    const coordinates = parseCoordinates(payload[0]);
    geocodeCache.set(normalized, coordinates);
    return coordinates;
  }

  geocodeCache.set(normalized, null);
  return null;
}
