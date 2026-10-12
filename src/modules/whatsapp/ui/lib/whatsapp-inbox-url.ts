import type { ReadonlyURLSearchParams } from "next/navigation";
import { SUPERADMIN_DEFAULT_INBOX_LOCATION } from "@/lib/whatsapp/locationConstants";

export const WHATSAPP_LOCATION_FILTER_STORAGE_KEY = "whatsapp_location_filter";

export type WhatsAppInboxUrlPatch = {
  conversation?: string | null;
  locationFilter?: string | null;
  adminQueue?: boolean | null;
  retargetOnly?: boolean | null;
};

type SearchParamsLike = ReadonlyURLSearchParams | URLSearchParams | null | undefined;

function readRetargetOnly(current: SearchParamsLike): boolean {
  const v = current?.get("retargetOnly");
  return v === "1" || v === "true";
}

function readAdminQueue(current: SearchParamsLike): boolean {
  return current?.get("adminQueue") === "true";
}

function readLocationFilter(current: SearchParamsLike): string | null {
  return current?.get("locationFilter") ?? null;
}

function readConversationId(current: SearchParamsLike): string | null {
  return current?.get("conversation") || current?.get("conversationId") || null;
}

/** Build /whatsapp URL preserving inbox filters (location, admin queue, retarget). */
export function buildWhatsAppInboxUrl(
  current: SearchParamsLike,
  patch: WhatsAppInboxUrlPatch = {},
): string {
  const next = new URLSearchParams();

  const retargetOnly =
    patch.retargetOnly !== undefined && patch.retargetOnly !== null
      ? patch.retargetOnly
      : readRetargetOnly(current);

  const adminQueue =
    patch.adminQueue !== undefined && patch.adminQueue !== null
      ? patch.adminQueue
      : readAdminQueue(current);

  const locationFilter =
    patch.locationFilter !== undefined
      ? patch.locationFilter
      : readLocationFilter(current);

  const conversation =
    patch.conversation !== undefined
      ? patch.conversation
      : readConversationId(current);

  if (retargetOnly) next.set("retargetOnly", "1");

  if (adminQueue) {
    next.set("adminQueue", "true");
  } else if (locationFilter) {
    next.set("locationFilter", locationFilter);
  }

  if (conversation) next.set("conversation", conversation);

  const qs = next.toString();
  return qs ? `/whatsapp?${qs}` : "/whatsapp";
}

type InboxLocationToken = {
  role?: string;
  allotedArea?: string | string[];
};

export type ResolvedInboxLocationDefaults = {
  adminLocationFilter: string;
  adminQueue: boolean;
  /** True when URL should be updated to reflect resolved defaults (missing param). */
  shouldSyncUrl: boolean;
  urlLocationFilter: string | null;
};

function readStoredSuperAdminLocationFilter(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(WHATSAPP_LOCATION_FILTER_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Resolve inbox location filter synchronously (URL → localStorage → role default).
 * No API calls — safe to run before enabling the conversations query.
 */
export function resolveInboxLocationDefaults(
  token: InboxLocationToken | null | undefined,
  searchParams: SearchParamsLike,
): ResolvedInboxLocationDefaults {
  const adminQueueFromUrl = searchParams?.get("adminQueue") === "true";
  const fromUrl = searchParams?.get("locationFilter")?.trim() || null;

  if (adminQueueFromUrl) {
    return {
      adminLocationFilter: "all",
      adminQueue: true,
      shouldSyncUrl: false,
      urlLocationFilter: null,
    };
  }

  if (fromUrl) {
    return {
      adminLocationFilter: fromUrl,
      adminQueue: false,
      shouldSyncUrl: false,
      urlLocationFilter: fromUrl,
    };
  }

  if (!token) {
    return {
      adminLocationFilter: "all",
      adminQueue: false,
      shouldSyncUrl: false,
      urlLocationFilter: null,
    };
  }

  const role = (token.role || "").trim();

  if (role === "SuperAdmin") {
    const stored = readStoredSuperAdminLocationFilter();
    const location = stored?.trim() || SUPERADMIN_DEFAULT_INBOX_LOCATION;
    return {
      adminLocationFilter: location,
      adminQueue: false,
      shouldSyncUrl: true,
      urlLocationFilter: location,
    };
  }

  // LeadGen-TeamLead: no allotedArea — default to admin queue (unassigned location chats).
  if (role === "LeadGen-TeamLead") {
    return {
      adminLocationFilter: "all",
      adminQueue: true,
      shouldSyncUrl: true,
      urlLocationFilter: null,
    };
  }

  const allotted = token.allotedArea;
  if (allotted) {
    const area =
      typeof allotted === "string"
        ? allotted.trim()
        : Array.isArray(allotted)
          ? String(allotted[0] ?? "").trim()
          : "";
    if (area && area !== "all" && area !== "both") {
      return {
        adminLocationFilter: area,
        adminQueue: false,
        shouldSyncUrl: false,
        urlLocationFilter: null,
      };
    }
  }

  return {
    adminLocationFilter: "all",
    adminQueue: false,
    shouldSyncUrl: false,
    urlLocationFilter: null,
  };
}

export function persistSuperAdminLocationFilter(location: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WHATSAPP_LOCATION_FILTER_STORAGE_KEY, location);
  } catch {
    /* ignore */
  }
}
