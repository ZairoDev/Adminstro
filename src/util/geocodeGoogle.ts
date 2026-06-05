/**
 * Forward geocoding via Google Maps Geocoding API (server-side only).
 * @see https://developers.google.com/maps/documentation/geocoding/requests-geocoding
 *
 * Required: Geocoding API enabled + billing on the GCP project.
 * Env (first match wins):
 *   GOOGLE_GEOCODING_API_KEY — recommended server key (Geocoding API only)
 *   GOOGLE_MAPS_API_KEY
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *
 * Optional: GOOGLE_GEOCODING_REQUEST_DELAY_MS (default 200)
 *
 * Limits (per Google docs):
 * - HTTPS required; address or components required; URL max 16384 chars
 * - Status: OK | ZERO_RESULTS | OVER_QUERY_LIMIT | REQUEST_DENIED | INVALID_REQUEST
 * - Billed per Geocoding SKU; respect project QPM/quota in Cloud Console
 */

export interface GeocodeCoordinates {
  lat: number;
  lng: number;
}

export interface GeocodeGoogleOptions {
  /** ISO 3166-1 alpha-2, e.g. ["gr"] — maps to components=country:xx */
  countryCodes?: string[];
  delayMs?: number;
  maxRetries?: number;
  language?: string;
}

type GoogleLocationType =
  | "ROOFTOP"
  | "RANGE_INTERPOLATED"
  | "GEOMETRIC_CENTER"
  | "APPROXIMATE";

interface GoogleGeocodeResult {
  formatted_address?: string;
  partial_match?: boolean;
  geometry: {
    location: { lat: number; lng: number };
    location_type?: GoogleLocationType;
  };
}

interface GoogleGeocodeResponse {
  status: string;
  results: GoogleGeocodeResult[];
  error_message?: string;
}

const GOOGLE_GEOCODE_URL =
  "https://maps.googleapis.com/maps/api/geocode/json";
const DEFAULT_DELAY_MS = 200;
const DEFAULT_MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_ADDRESS_LENGTH = 16_000;

/** City (owner-sheet location) → ISO 3166-1 alpha-2 for components=country:xx */
const CITY_COUNTRY_ISO: Record<string, string> = {
  athens: "gr",
  thessaloniki: "gr",
  chania: "gr",
  milan: "it",
  rome: "it",
  barcelona: "es",
  lisbon: "pt",
  dubai: "ae",
  bangkok: "th",
  phuket: "th",
  bali: "id",
  istanbul: "tr",
  paris: "fr",
  london: "gb",
  amsterdam: "nl",
  lisboa: "pt",
};

const geocodeCache = new Map<string, GeocodeCoordinates | null>();
let lastRequestAt = 0;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getGoogleGeocodingApiKey(): string | null {
  const candidates = [
    process.env.GOOGLE_GEOCODING_API_KEY,
    process.env.GOOGLE_MAPS_API_KEY,
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  ];
  for (const raw of candidates) {
    const key = raw?.trim();
    if (key && key.length > 0) {
      return key;
    }
  }
  return null;
}

export function inferCountryCodeFromLocation(
  location: string | null | undefined,
): string | undefined {
  const normalized = (location ?? "").trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return CITY_COUNTRY_ISO[normalized];
}

function primaryCountryCode(codes: string[] | undefined): string | undefined {
  if (!codes?.length) {
    return undefined;
  }
  const code = codes[0]?.trim().toLowerCase();
  return code && /^[a-z]{2}$/.test(code) ? code : undefined;
}

async function waitForRateLimit(delayMs: number): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < delayMs) {
    await delay(delayMs - elapsed);
  }
}

function parseLocation(
  result: GoogleGeocodeResult | undefined,
): GeocodeCoordinates | null {
  const lat = result?.geometry?.location?.lat;
  const lng = result?.geometry?.location?.lng;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

function queryLooksLikeAddress(query: string): boolean {
  return (
    /\d/.test(query) ||
    /\b(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd|str\.?|lane|ln\.?|drive|dr\.?)\b/i.test(
      query,
    )
  );
}

function isAcceptableGoogleResult(
  result: GoogleGeocodeResult,
  query: string,
): boolean {
  const locationType = result.geometry.location_type;
  if (!locationType) {
    return false;
  }

  if (result.partial_match && queryLooksLikeAddress(query)) {
    return false;
  }

  const preciseTypes: GoogleLocationType[] = [
    "ROOFTOP",
    "RANGE_INTERPOLATED",
  ];
  const placeTypes: GoogleLocationType[] = [
    "ROOFTOP",
    "RANGE_INTERPOLATED",
    "GEOMETRIC_CENTER",
    "APPROXIMATE",
  ];

  const allowed = queryLooksLikeAddress(query) ? preciseTypes : placeTypes;
  return allowed.includes(locationType);
}

function isRetryableStatus(status: string): boolean {
  return status === "OVER_QUERY_LIMIT" || status === "UNKNOWN_ERROR";
}

function isFatalStatus(status: string): boolean {
  return status === "REQUEST_DENIED";
}

/**
 * Forward-geocode a postal-style address or place string.
 * Returns null on ZERO_RESULTS, low-precision matches, or quota/auth errors.
 */
export async function geocodeWithGoogle(
  address: string,
  options?: GeocodeGoogleOptions,
): Promise<GeocodeCoordinates | null> {
  const trimmed = address.trim();
  if (trimmed.length < 2 || trimmed.length > MAX_ADDRESS_LENGTH) {
    return null;
  }

  const apiKey = getGoogleGeocodingApiKey();
  if (!apiKey) {
    console.error(
      "[geocode] Google API key missing. Set GOOGLE_GEOCODING_API_KEY (or GOOGLE_MAPS_API_KEY).",
    );
    return null;
  }

  const country = primaryCountryCode(options?.countryCodes);
  const normalized = normalizeQuery(trimmed);
  const cacheKey = country ? `${normalized}|${country}` : normalized;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  const delayMs =
    options?.delayMs ??
    (Number(process.env.GOOGLE_GEOCODING_REQUEST_DELAY_MS) ||
      DEFAULT_DELAY_MS);
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    await waitForRateLimit(delayMs);
    lastRequestAt = Date.now();

    const url = new URL(GOOGLE_GEOCODE_URL);
    url.searchParams.set("address", trimmed);
    url.searchParams.set("key", apiKey);

    if (country) {
      url.searchParams.set("components", `country:${country}`);
      url.searchParams.set("region", country);
    }

    if (options?.language) {
      url.searchParams.set("language", options.language);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      if (attempt < maxRetries) {
        await delay(delayMs * attempt);
        continue;
      }
      console.error("[geocode] Google Geocoding request failed:", error);
      geocodeCache.set(cacheKey, null);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < maxRetries) {
        await delay(delayMs * attempt);
        continue;
      }
      geocodeCache.set(cacheKey, null);
      return null;
    }

    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    let payload: GoogleGeocodeResponse;
    try {
      payload = (await response.json()) as GoogleGeocodeResponse;
    } catch {
      if (attempt < maxRetries) {
        await delay(delayMs * attempt);
        continue;
      }
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const status = payload.status ?? "";

    if (isFatalStatus(status)) {
      console.error(
        `[geocode] Google Geocoding ${status}: ${payload.error_message ?? "request denied"}`,
      );
      geocodeCache.set(cacheKey, null);
      return null;
    }

    if (status === "ZERO_RESULTS" || status === "INVALID_REQUEST") {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    if (isRetryableStatus(status)) {
      if (attempt < maxRetries) {
        await delay(delayMs * attempt * 2);
        continue;
      }
      geocodeCache.set(cacheKey, null);
      return null;
    }

    if (status !== "OK" || !payload.results?.length) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const match = payload.results.find((r) =>
      isAcceptableGoogleResult(r, trimmed),
    );
    const coordinates = parseLocation(match ?? payload.results[0]);
    if (!match || !coordinates) {
      geocodeCache.set(cacheKey, null);
      return null;
    }

    geocodeCache.set(cacheKey, coordinates);
    return coordinates;
  }

  geocodeCache.set(cacheKey, null);
  return null;
}
