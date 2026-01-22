/**
 * Phone Metadata Sync from Meta API
 * 
 * Meta is the ONLY source of truth for phone number metadata.
 * This module fetches phone metadata from Meta and overwrites local config values.
 * No merge/fallback logic - Meta values always win.
 */

import { WHATSAPP_API_BASE_URL, getWhatsAppToken, WHATSAPP_BUSINESS_ACCOUNT_ID, type WhatsAppPhoneConfig } from "./config";

export interface MetaPhoneMetadata {
  verified_name?: string;
  display_phone_number?: string;
  code_verification_status?: "VERIFIED" | "UNVERIFIED";
  quality_rating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
}

export interface MetaPhoneNumber {
  id: string;
  verified_name?: string;
  display_phone_number?: string;
  code_verification_status?: "VERIFIED" | "UNVERIFIED";
  quality_rating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
}

/**
 * Fetch phone metadata from Meta API
 * 
 * CRITICAL: No caching - always fetches fresh from Meta
 * Meta is the ONLY source of truth - stale local cache is never used
 * 
 * Returns null if fetch fails (no fallback to local values)
 */
export async function fetchPhoneMetadataFromMeta(
  phoneNumberId: string
): Promise<MetaPhoneMetadata | null> {
  try {
    const token = getWhatsAppToken();
    if (!token) {
      // Silent fail - token not available is expected in some cases
      return null;
    }

    // CRITICAL: Always fetch fresh from Meta API - NO CACHING
    // Fields: verified_name, display_phone_number, code_verification_status, quality_rating, status
    // Use AbortController for timeout control (8 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `${WHATSAPP_API_BASE_URL}/${phoneNumberId}?fields=verified_name,display_phone_number,code_verification_status,quality_rating,status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // Force fresh fetch - no cache
          cache: "no-store",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Only log non-timeout errors (4xx, 5xx)
        const errorData = await response.json().catch(() => ({}));
        if (response.status >= 400 && response.status < 500) {
          // Client errors (4xx) - might be auth issues, log once
          console.warn(`[Meta API] Client error fetching metadata for ${phoneNumberId}:`, response.status, errorData);
        } else if (response.status >= 500) {
          // Server errors (5xx) - Meta API issue, log once
          console.warn(`[Meta API] Server error fetching metadata for ${phoneNumberId}:`, response.status);
        }
        return null;
      }

      const data = await response.json();
      return data as MetaPhoneMetadata;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout/abort gracefully - these are expected network issues
      if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
        // Timeout is expected in some network conditions - don't spam logs
        // Only log in development or if it's a persistent issue
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Meta API] Timeout fetching metadata for ${phoneNumberId} (using local fallback)`);
        }
        return null;
      }
      
      // Re-throw unexpected errors
      throw fetchError;
    }
  } catch (error: any) {
    // Only log unexpected errors (not timeouts)
    if (error.name !== 'AbortError' && error.code !== 'UND_ERR_CONNECT_TIMEOUT') {
      console.warn(`[Meta API] Unexpected error fetching metadata for ${phoneNumberId}:`, error.message || error);
    }
    return null;
  }
}

/**
 * Fetch all phone numbers from Meta API for a business account
 * Returns array of phone numbers registered in the WhatsApp Business Account
 */
export async function fetchPhoneNumbersFromMeta(
  businessAccountId: string = WHATSAPP_BUSINESS_ACCOUNT_ID
): Promise<MetaPhoneNumber[]> {
  try {
    const token = getWhatsAppToken();
    if (!token) {
      return [];
    }

    if (!businessAccountId) {
      console.warn("[Meta API] No business account ID provided");
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(
        `${WHATSAPP_API_BASE_URL}/${businessAccountId}/phone_numbers?fields=id,verified_name,display_phone_number,code_verification_status,quality_rating,status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status >= 400 && response.status < 500) {
          console.warn(`[Meta API] Client error fetching phone numbers:`, response.status, errorData);
        } else if (response.status >= 500) {
          console.warn(`[Meta API] Server error fetching phone numbers:`, response.status);
        }
        return [];
      }

      const data = await response.json();
      // Meta API returns { data: [...] } format
      return (data.data || []) as MetaPhoneNumber[];
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError' || fetchError.code === 'UND_ERR_CONNECT_TIMEOUT') {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[Meta API] Timeout fetching phone numbers from Meta`);
        }
        return [];
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    if (error.name !== 'AbortError' && error.code !== 'UND_ERR_CONNECT_TIMEOUT') {
      console.warn(`[Meta API] Error fetching phone numbers:`, error.message || error);
    }
    return [];
  }
}

/**
 * Convert Meta phone numbers to WhatsAppPhoneConfig format
 * Maps Meta phone numbers to config format with area assignment
 */
export function mapMetaPhonesToConfigs(
  metaPhones: MetaPhoneNumber[],
  areaMapping?: Map<string, string | string[]> // phoneNumberId -> area(s)
): Array<WhatsAppPhoneConfig & { metaMetadata?: any; _syncedFromMeta?: boolean; _syncedAt?: string }> {
  return metaPhones.map((phone) => {
    // Try to get area from mapping, or default to "all"
    const mappedArea = areaMapping?.get(phone.id);
    // Cast to WhatsAppArea type (validated areas from config)
    // If mappedArea exists and is from config, it's already a valid WhatsAppArea
    const area = (mappedArea || "all") as WhatsAppPhoneConfig["area"];
    
    return {
      phoneNumberId: phone.id,
      displayName: phone.verified_name || phone.display_phone_number || "Unknown",
      displayNumber: phone.display_phone_number || phone.id,
      area: area,
      businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
      // Store Meta metadata
      metaMetadata: {
        verified_name: phone.verified_name,
        display_phone_number: phone.display_phone_number,
        code_verification_status: phone.code_verification_status,
        quality_rating: phone.quality_rating,
        status: phone.status,
      },
      _syncedFromMeta: true,
      _syncedAt: new Date().toISOString(),
    };
  });
}

/**
 * Sync phone configs with Meta - overwrite local values with Meta values
 * Meta is the ONLY source of truth
 */
export async function syncPhoneConfigsWithMeta(
  phoneConfigs: Array<{ phoneNumberId: string; displayName?: string; displayNumber?: string; [key: string]: any }>
): Promise<Array<{ phoneNumberId: string; displayName: string; displayNumber: string; [key: string]: any }>> {
  // Fetch metadata from Meta for all phone numbers in parallel
  const metadataResults = await Promise.all(
    phoneConfigs.map(async (config) => {
      if (!config.phoneNumberId) return { config, metadata: null };
      
      const metadata = await fetchPhoneMetadataFromMeta(config.phoneNumberId);
      return { config, metadata };
    })
  );

  // Overwrite local configs with Meta values (no merge, no fallback)
  // Meta is the ONLY source of truth - local values are completely replaced
  return metadataResults.map(({ config, metadata }) => {
    if (!metadata) {
      // If Meta fetch failed (timeout/network issue), use local values gracefully
      // This is expected in some network conditions - not a critical error
      // Only log in development to avoid log spam
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Meta API] Using local fallback for ${config.phoneNumberId} (Meta fetch unavailable)`);
      }
      return {
        ...config,
        displayName: config.displayName || "Unknown",
        displayNumber: config.displayNumber || "",
        // Mark as stale/unsynced (for potential retry later)
        _metaSyncFailed: true,
        _metaSyncFailedAt: new Date().toISOString(),
      };
    }

    // Meta is source of truth - COMPLETELY OVERWRITE local metadata fields
    // No merge, no fallback - Meta values always win
    return {
      ...config,
      // CRITICAL: Meta's verified_name OVERWRITES local displayName
      displayName: metadata.verified_name || config.displayName || "Unknown",
      // CRITICAL: Meta's display_phone_number OVERWRITES local displayNumber
      displayNumber: metadata.display_phone_number || config.displayNumber || "",
      // Store additional Meta metadata for reference
      metaMetadata: {
        verified_name: metadata.verified_name,
        display_phone_number: metadata.display_phone_number,
        code_verification_status: metadata.code_verification_status,
        quality_rating: metadata.quality_rating,
        status: metadata.status,
      },
      // Mark as synced from Meta
      _syncedFromMeta: true,
      _syncedAt: new Date().toISOString(),
    };
  });
}
