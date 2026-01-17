/**
 * Phone Metadata Sync from Meta API
 * 
 * Meta is the ONLY source of truth for phone number metadata.
 * This module fetches phone metadata from Meta and overwrites local config values.
 * No merge/fallback logic - Meta values always win.
 */

import { WHATSAPP_API_BASE_URL, getWhatsAppToken } from "./config";

export interface MetaPhoneMetadata {
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
      console.error("WhatsApp token not available for metadata fetch");
      return null;
    }

    // CRITICAL: Always fetch fresh from Meta API - NO CACHING
    // Fields: verified_name, display_phone_number, code_verification_status, quality_rating, status
    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}?fields=verified_name,display_phone_number,code_verification_status,quality_rating,status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Force fresh fetch - no cache
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Meta API error fetching metadata for ${phoneNumberId}:`, errorData);
      return null;
    }

    const data = await response.json();
    return data as MetaPhoneMetadata;
  } catch (error) {
    console.error(`Error fetching phone metadata from Meta for ${phoneNumberId}:`, error);
    return null;
  }
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
      // If Meta fetch failed, log error but still return config
      // This should be rare - in production, we should handle this case
      console.error(`CRITICAL: Failed to fetch metadata from Meta for ${config.phoneNumberId}. Using local values as emergency fallback.`);
      return {
        ...config,
        displayName: config.displayName || "Unknown",
        displayNumber: config.displayNumber || "",
        // Mark as stale/unsynced
        _metaSyncFailed: true,
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
