import { normalizeCityKey } from "@/lib/city-normalizer";
import WhatsappChannel, {
  IWhatsappChannel,
  WhatsappChannelRentalType,
  WhatsappChannelType,
} from "@/models/whatsappChannel";
import WhatsappChannelAssignment from "@/models/whatsappChannelAssignment";
import { getWhatsAppToken, WHATSAPP_API_BASE_URL } from "@/lib/whatsapp/config";
import {
  normalizeChannelRentalType,
  resolveConversationRentalType,
} from "@/lib/whatsapp/rentalTypeAccess";
import mongoose from "mongoose";

export type ResolvedChannel = {
  channelId: string;
  name: string;
  channelType: WhatsappChannelType;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  wabaId: string;
  wabaName: string;
  businessPortfolioId: string;
  businessPortfolioName: string;
  rentalType: WhatsappChannelRentalType;
  active: boolean;
};

function toResolvedChannel(channel: IWhatsappChannel): ResolvedChannel {
  return {
    channelId: String(channel._id),
    name: channel.name,
    channelType: channel.channelType,
    phoneNumberId: channel.phoneNumberId,
    displayPhoneNumber: channel.displayPhoneNumber || "",
    accessToken: channel.accessToken || "",
    wabaId: channel.wabaId || "",
    wabaName: channel.wabaName || "",
    businessPortfolioId: channel.businessPortfolioId || "",
    businessPortfolioName: channel.businessPortfolioName || "",
    rentalType: channel.rentalType,
    active: channel.active,
  };
}

/** Normalize a list of location display names / keys into deduped city keys. */
export function normalizeChannelLocationKeys(locations: unknown): string[] {
  if (!Array.isArray(locations)) return [];
  const keys = locations
    .map((l) => normalizeCityKey(String(l ?? "")))
    .filter((k): k is string => Boolean(k));
  return Array.from(new Set(keys));
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND ROUTING — resolves by location + rentalType + channelType
// ─────────────────────────────────────────────────────────────────────────────

/** Map conversationType (guest/owner) to channelType when not explicitly set. */
export function inferChannelTypeFromConversation(params: {
  channelType?: WhatsappChannelType | null;
  conversationType?: "owner" | "guest" | null;
}): WhatsappChannelType | null {
  if (params.channelType) return params.channelType;
  if (params.conversationType === "guest") return "guest";
  if (params.conversationType === "owner") return "owner";
  return null;
}

type OutboundConversationContext = {
  whatsappChannelId?: mongoose.Types.ObjectId | string | null;
  businessPhoneId?: string;
  participantLocation?: string;
  participantLocationKey?: string;
  rentalType?: string | null;
  channelType?: WhatsappChannelType | null;
  conversationType?: "owner" | "guest" | null;
  isRetarget?: boolean;
};

/**
 * Resolve which channel (and phone line) should send outbound messages for a
 * conversation. Routes by current location + rentalType + guest/owner first so
 * reassigned locations use the correct line; falls back to frozen whatsappChannelId.
 */
export async function resolveOutboundChannelForConversation(
  conversation: OutboundConversationContext,
): Promise<{ channel: ResolvedChannel | null; source: string }> {
  if (conversation.isRetarget && conversation.businessPhoneId?.trim()) {
    const byPhone =
      (await getActiveChannelByPhoneNumberId(conversation.businessPhoneId)) ??
      (await getChannelByPhoneNumberId(conversation.businessPhoneId));
    return { channel: byPhone, source: "retarget_line" };
  }

  const channelType = inferChannelTypeFromConversation({
    channelType: conversation.channelType,
    conversationType: conversation.conversationType,
  });
  const location =
    conversation.participantLocation?.trim() ||
    conversation.participantLocationKey?.trim() ||
    "";
  const rentalType = resolveConversationRentalType(conversation.rentalType);

  // Current location is authoritative when guest/owner is reassigned to a new city.
  if (location) {
    const routed = await resolveWhatsappChannel({
      location,
      rentalType,
      channelType,
    });
    if (routed) {
      return { channel: routed, source: "channel_routing" };
    }
  }

  // Frozen channel preserves continuity when location routing has no match.
  if (conversation.whatsappChannelId) {
    const frozen = await resolveChannelContextFromConversation(conversation);
    if (frozen) {
      return { channel: frozen, source: "frozen_channel" };
    }
  }

  if (conversation.businessPhoneId?.trim()) {
    const byPhone =
      (await getActiveChannelByPhoneNumberId(conversation.businessPhoneId)) ??
      (await getChannelByPhoneNumberId(conversation.businessPhoneId));
    if (byPhone) {
      return { channel: byPhone, source: "phone_lookup" };
    }
  }

  return { channel: null, source: "none" };
}

export type ConversationChannelFields = {
  whatsappChannelId: string;
  businessPhoneId: string;
  channelType?: WhatsappChannelType;
  rentalType?: WhatsappChannelRentalType;
  businessPortfolioId?: string;
  wabaId?: string;
};

/**
 * Resolve and return channel fields for a conversation's current location.
 * Used when participant location is reassigned so outbound sends use the new line.
 */
export async function resolveChannelFieldsForConversationLocation(
  conversation: OutboundConversationContext,
): Promise<ConversationChannelFields | null> {
  const channelType = inferChannelTypeFromConversation({
    channelType: conversation.channelType,
    conversationType: conversation.conversationType,
  });
  const location =
    conversation.participantLocation?.trim() ||
    conversation.participantLocationKey?.trim() ||
    "";
  const rentalType = resolveConversationRentalType(conversation.rentalType);
  if (!location) return null;

  const channel = await resolveWhatsappChannel({
    location,
    rentalType,
    channelType,
  });
  if (!channel) return null;

  return {
    whatsappChannelId: channel.channelId,
    businessPhoneId: channel.phoneNumberId,
    channelType: channelType ?? channel.channelType,
    rentalType: channel.rentalType,
    businessPortfolioId: channel.businessPortfolioId || undefined,
    wabaId:
      normalizeStoredWabaId(channel.wabaId, channel.businessPortfolioId) ||
      undefined,
  };
}

/**
 * Re-stamp frozen channel fields on a conversation after an explicit transfer
 * to a different business phone line.
 */
export async function stampConversationChannelFromPhone(
  conversation: {
    businessPhoneId?: string;
    whatsappChannelId?: mongoose.Types.ObjectId | string | null;
    channelType?: WhatsappChannelType;
    rentalType?: WhatsappChannelRentalType;
    businessPortfolioId?: string;
    wabaId?: string;
  },
  phoneNumberId: string,
): Promise<void> {
  const phone = phoneNumberId?.trim();
  if (!phone) return;

  conversation.businessPhoneId = phone;

  const channel =
    (await getActiveChannelByPhoneNumberId(phone)) ??
    (await getChannelByPhoneNumberId(phone));

  if (!channel) return;

  conversation.whatsappChannelId = channel.channelId;
  conversation.channelType = channel.channelType;
  conversation.rentalType = channel.rentalType;
  conversation.businessPortfolioId = channel.businessPortfolioId || undefined;
  conversation.wabaId =
    normalizeStoredWabaId(channel.wabaId, channel.businessPortfolioId) || undefined;
}

/**
 * Central outbound routing service.
 *
 *   Location + Rental Type + Channel Type  ──▶  Whatsapp Channel  ──▶  Phone + Token + WABA
 *
 * Resolution order:
 *   1. Exact match: active channel with location key ∈ assignedLocations AND rentalType AND channelType.
 *   2. When channelType not provided: any channelType for same location + rentalType.
 *   3. "General" channel for the same location (rental-type agnostic).
 *   4. null — caller should fall back to legacy phone routing.
 *
 * NEVER use this for inbound webhook processing — use getActiveChannelByPhoneNumberId instead.
 */
export async function resolveWhatsappChannel(params: {
  location?: string | null;
  rentalType?: string | null;
  channelType?: WhatsappChannelType | null;
}): Promise<ResolvedChannel | null> {
  const key = normalizeCityKey(String(params.location ?? ""));
  if (!key) return null;

  const requested = normalizeChannelRentalType(params.rentalType);

  if (requested && requested !== "General") {
    const exactFilter: Record<string, unknown> = {
      assignedLocations: key,
      rentalType: requested,
      active: true,
    };
    if (params.channelType) {
      exactFilter.channelType = params.channelType;
    }
    const exact = await WhatsappChannel.findOne(exactFilter).lean<IWhatsappChannel | null>();
    if (exact) return toResolvedChannel(exact);
  }

  // Fallback: a General channel covering this location.
  const generalFilter: Record<string, unknown> = {
    assignedLocations: key,
    rentalType: "General",
    active: true,
  };
  if (params.channelType) {
    generalFilter.channelType = params.channelType;
  }
  const general = await WhatsappChannel.findOne(generalFilter).lean<IWhatsappChannel | null>();
  if (general) return toResolvedChannel(general);

  // Last resort: any active channel for the location when no rental type specified.
  if (!requested) {
    const anyFilter: Record<string, unknown> = { assignedLocations: key, active: true };
    if (params.channelType) anyFilter.channelType = params.channelType;
    const any = await WhatsappChannel.findOne(anyFilter).lean<IWhatsappChannel | null>();
    if (any) return toResolvedChannel(any);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND ROUTING — resolves by phoneNumberId only (race-condition safe)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inbound-safe channel lookup: find the currently ACTIVE channel for a phone number.
 *
 * This is the ONLY method that should be called from inbound webhook processing.
 * Using location+rentalType for inbound routing is unsafe — an admin could remap
 * channels while webhooks are in flight, causing wrong channel associations.
 *
 * Returns null when no active channel exists for the phone (use legacy businessPhoneId fallback).
 */
export async function getActiveChannelByPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedChannel | null> {
  if (!phoneNumberId?.trim()) return null;
  const channel = await WhatsappChannel.findOne({
    phoneNumberId: phoneNumberId.trim(),
    active: true,
  }).lean<IWhatsappChannel | null>();
  return channel ? toResolvedChannel(channel) : null;
}

/**
 * Resolve the channel that owns a given phone number id (active OR inactive).
 * Use this for outbound sends on EXISTING conversations, where the conversation
 * already holds a frozen whatsappChannelId.
 */
export async function getChannelByPhoneNumberId(
  phoneNumberId: string,
): Promise<ResolvedChannel | null> {
  if (!phoneNumberId?.trim()) return null;
  const channel = await WhatsappChannel.findOne({
    phoneNumberId: phoneNumberId.trim(),
  })
    .sort({ assignedAt: -1 }) // prefer most recent if multiple inactive
    .lean<IWhatsappChannel | null>();
  return channel ? toResolvedChannel(channel) : null;
}

/**
 * Resolve the channel context for an existing conversation's outbound sends.
 * Prefers the frozen whatsappChannelId snapshot; falls back to phone number lookup.
 */
export async function resolveChannelContextFromConversation(conversation: {
  whatsappChannelId?: mongoose.Types.ObjectId | string | null;
  businessPhoneId?: string;
}): Promise<ResolvedChannel | null> {
  // Prefer the frozen channel snapshot attached to the conversation.
  if (conversation.whatsappChannelId) {
    const byId = await WhatsappChannel.findById(conversation.whatsappChannelId).lean<IWhatsappChannel | null>();
    if (byId) return toResolvedChannel(byId);
  }
  // Legacy fallback: look up by phone number.
  if (conversation.businessPhoneId) {
    return getChannelByPhoneNumberId(conversation.businessPhoneId);
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WABA RESOLUTION (templates, admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ask Meta which WABA owns a phone number. Authoritative when stored wabaId
 * is missing, stale, or was confused with a Business Portfolio ID.
 */
export async function resolveWabaIdFromPhoneNumberId(
  phoneNumberId: string,
  accessToken: string,
): Promise<string | null> {
  const phoneId = phoneNumberId?.trim();
  const token = accessToken?.trim();
  if (!phoneId || !token) return null;

  try {
    const url = `${WHATSAPP_API_BASE_URL}/${phoneId}?fields=whatsapp_business_account`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      whatsapp_business_account?: { id?: string };
    };
    const id = data?.whatsapp_business_account?.id?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/** Trim; treat blank as missing. Reject portfolio ID accidentally stored as WABA. */
export function normalizeStoredWabaId(
  wabaId: unknown,
  businessPortfolioId?: unknown,
): string | null {
  const waba = String(wabaId ?? "").trim();
  if (!waba) return null;
  const portfolio = String(businessPortfolioId ?? "").trim();
  if (portfolio && waba === portfolio) return null;
  return waba;
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND SEND CREDENTIALS (phone + token pairs)
// ─────────────────────────────────────────────────────────────────────────────

export type OutboundTokenConversation = {
  whatsappChannelId?: mongoose.Types.ObjectId | string | null;
  businessPhoneId?: string;
};

export type OutboundSendCredentials = {
  phoneNumberId: string;
  accessToken: string;
  source: string;
};

/** Meta Graph error when an object id is missing or the token cannot access it. */
export function isInvalidGraphObjectError(data: unknown): boolean {
  const err = (data as { error?: { code?: number; error_subcode?: number } })?.error;
  return err?.code === 100 && err?.error_subcode === 33;
}

async function canAccessPhoneNumberId(
  phoneNumberId: string,
  accessToken: string,
): Promise<boolean> {
  const phoneId = phoneNumberId?.trim();
  const token = accessToken?.trim();
  if (!phoneId || !token) return false;

  try {
    const res = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneId}?fields=id`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function listPhoneNumberIdsForWaba(
  wabaId: string,
  accessToken: string,
): Promise<string[]> {
  const id = wabaId?.trim();
  const token = accessToken?.trim();
  if (!id || !token) return [];

  try {
    const res = await fetch(
      `${WHATSAPP_API_BASE_URL}/${id}/phone_numbers?fields=id`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    return (data.data ?? [])
      .map((row) => row.id?.trim())
      .filter((rowId): rowId is string => Boolean(rowId));
  } catch {
    return [];
  }
}

/**
 * Resolve a phoneNumberId + accessToken pair validated against Meta.
 * Tries frozen channel credentials first, then WABA phone list when the stored
 * phone id is stale or was confused with another Graph object id.
 */
export async function resolveOutboundSendCredentials(params: {
  phoneNumberId: string;
  conversation?: OutboundTokenConversation | null;
  /** When false, never substitute a different WABA phone line (existing conversations). */
  allowWabaPhoneFallback?: boolean;
}): Promise<OutboundSendCredentials | null> {
  const requestedPhone = params.phoneNumberId?.trim();
  if (!requestedPhone) return null;

  const frozenChannel = params.conversation
    ? await resolveChannelContextFromConversation(params.conversation)
    : null;
  const phoneChannel = await getChannelByPhoneNumberId(requestedPhone);
  const channelRecord = frozenChannel ?? phoneChannel;

  const tokens: Array<{ token: string; source: string }> = [];
  const addToken = (token: string | undefined | null, source: string) => {
    const value = token?.trim();
    if (!value || tokens.some((row) => row.token === value)) return;
    tokens.push({ token: value, source });
  };

  addToken(frozenChannel?.accessToken, "frozen_channel");
  addToken(phoneChannel?.accessToken, "phone_lookup");
  addToken(getWhatsAppToken(), "env_global");

  if (tokens.length === 0) return null;

  const phones: Array<{ phone: string; source: string }> = [];
  const addPhone = (phone: string | undefined | null, source: string) => {
    const value = phone?.trim();
    if (!value || phones.some((row) => row.phone === value)) return;
    phones.push({ phone: value, source });
  };

  addPhone(requestedPhone, "requested");
  addPhone(frozenChannel?.phoneNumberId, "frozen_channel");
  addPhone(phoneChannel?.phoneNumberId, "phone_lookup");

  for (const { token, source: tokenSource } of tokens) {
    for (const { phone, source: phoneSource } of phones) {
      if (await canAccessPhoneNumberId(phone, token)) {
        return {
          phoneNumberId: phone,
          accessToken: token,
          source: `${phoneSource}+${tokenSource}`,
        };
      }
    }
  }

  if (params.allowWabaPhoneFallback !== false) {
    for (const { token, source: tokenSource } of tokens) {
      const storedWaba = normalizeStoredWabaId(
        channelRecord?.wabaId,
        channelRecord?.businessPortfolioId,
      );
      const metaWaba =
        storedWaba ??
        (await resolveWabaIdFromPhoneNumberId(requestedPhone, token));
      if (!metaWaba) continue;

      const wabaPhones = await listPhoneNumberIdsForWaba(metaWaba, token);
      const preferred = wabaPhones.filter((phone) =>
        phones.some((row) => row.phone === phone),
      );
      const candidates = preferred.length > 0 ? preferred : wabaPhones;

      for (const phone of candidates) {
        if (await canAccessPhoneNumberId(phone, token)) {
          return {
            phoneNumberId: phone,
            accessToken: token,
            source: `waba_phones+${tokenSource}`,
          };
        }
      }
    }
  }

  return null;
}

/**
 * Outbound access token for a phone number. Prefers the channel's own token so
 * each portfolio/WABA uses its dedicated credentials. When a channel row exists
 * for the line but has no token, returns empty (never mixes global token with
 * another portfolio's phoneNumberId). Global env token is only used when no
 * channel record exists (legacy single-WABA setup).
 */
export async function getOutboundTokenForPhoneId(
  phoneNumberId: string,
  conversation?: OutboundTokenConversation | null,
): Promise<string> {
  const creds = await resolveOutboundSendCredentials({
    phoneNumberId,
    conversation,
  });
  if (creds?.accessToken) return creds.accessToken;

  const phoneId = phoneNumberId?.trim();
  if (!phoneId) return "";

  try {
    if (conversation) {
      const frozen = await resolveChannelContextFromConversation(conversation);
      if (frozen?.accessToken?.trim()) return frozen.accessToken.trim();
    }

    const channel = await getChannelByPhoneNumberId(phoneId);
    if (channel) {
      return channel.accessToken?.trim() || "";
    }
  } catch {
    // fall through only when lookup failed entirely
  }

  return getWhatsAppToken();
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION & VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the (location, rentalType, channelType) uniqueness invariant before create.
 * The DB partial unique index on WhatsappChannelAssignment is the hard guarantee;
 * this pre-check provides a friendly error message before hitting the DB constraint.
 *
 * Athens + Long Term + Guest  and  Athens + Long Term + Owner  → OK (different channelType)
 * Athens + Long Term + Guest  in two active channels            → rejected
 */
export async function assertChannelTripleUnique(params: {
  rentalType: WhatsappChannelRentalType;
  channelType: WhatsappChannelType;
  assignedLocationKeys: string[];
  excludeChannelId?: string;
}): Promise<void> {
  const { rentalType, channelType, assignedLocationKeys, excludeChannelId } = params;
  if (assignedLocationKeys.length === 0) return;

  const filter: Record<string, unknown> = {
    rentalType,
    channelType,
    assignedLocations: { $in: assignedLocationKeys },
    active: true,
  };
  if (excludeChannelId) {
    filter._id = { $ne: excludeChannelId };
  }

  const conflict = await WhatsappChannel.findOne(filter).lean<IWhatsappChannel | null>();
  if (conflict) {
    const overlap = (conflict.assignedLocations || []).filter((k) =>
      assignedLocationKeys.includes(k),
    );
    const err: { message: string; status: number } = {
      message: `Location(s) ${overlap.join(", ")} already have an active "${channelType}" channel for rental type "${rentalType}" ("${conflict.name}"). Deactivate the existing channel first.`,
      status: 409,
    };
    throw err;
  }
}

/** @deprecated Use assertChannelTripleUnique which includes channelType. */
export async function assertLocationRentalTypeUnique(params: {
  rentalType: WhatsappChannelRentalType;
  assignedLocationKeys: string[];
  excludeChannelId?: string;
}): Promise<void> {
  // Legacy shim — channels created before channelType was mandatory did not have
  // a channelType, so we still need to check for conflicts without it.
  const { rentalType, assignedLocationKeys, excludeChannelId } = params;
  if (assignedLocationKeys.length === 0) return;

  const filter: Record<string, unknown> = {
    rentalType,
    assignedLocations: { $in: assignedLocationKeys },
    active: true,
  };
  if (excludeChannelId) {
    filter._id = { $ne: excludeChannelId };
  }

  const conflict = await WhatsappChannel.findOne(filter).lean<IWhatsappChannel | null>();
  if (conflict) {
    const overlap = (conflict.assignedLocations || []).filter((k) =>
      assignedLocationKeys.includes(k),
    );
    const err: { message: string; status: number } = {
      message: `Location(s) ${overlap.join(", ")} already assigned to "${conflict.name}" for rental type "${rentalType}".`,
      status: 409,
    };
    throw err;
  }
}

/**
 * Deactivate an active channel (channel versioning).
 *
 * Sets active=false + endedAt=now on the channel document AND closes out the
 * matching assignment row in WhatsappChannelAssignment.
 *
 * Existing conversations keep their frozen whatsappChannelId — they are NOT
 * re-linked to a new channel.
 */
export async function deactivateChannel(
  channelId: string,
  session?: mongoose.ClientSession,
): Promise<IWhatsappChannel | null> {
  const now = new Date();
  const opts = session ? { session, new: true } : { new: true };

  const channel = await WhatsappChannel.findByIdAndUpdate(
    channelId,
    { active: false, endedAt: now },
    opts,
  );

  if (!channel) return null;

  // Close assignment rows for this channel.
  await WhatsappChannelAssignment.updateMany(
    { channelId: channel._id, endedAt: null },
    { endedAt: now },
    session ? { session } : {},
  );

  return channel;
}

/**
 * Create a new channel and register its assignment rows in WhatsappChannelAssignment.
 * Called by the channels POST handler; also used after deactivateChannel on reassign.
 */
export async function createChannelWithAssignment(data: {
  name: string;
  channelType: WhatsappChannelType;
  businessPortfolioId: string;
  businessPortfolioName: string;
  wabaId: string;
  wabaName: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
  rentalType: WhatsappChannelRentalType;
  assignedLocations: string[];
  active: boolean;
  metadata?: Record<string, unknown>;
  assignedAt?: Date;
}, session?: mongoose.ClientSession): Promise<IWhatsappChannel> {
  const now = data.assignedAt ?? new Date();

  const [channel] = await WhatsappChannel.create(
    [{ ...data, assignedAt: now, endedAt: null }],
    session ? { session } : {},
  );

  // Register assignment rows for each location.
  if (data.active && data.assignedLocations.length > 0) {
    const assignmentDocs = data.assignedLocations.map((locationKey) => ({
      channelId: channel._id,
      locationKey,
      rentalType: data.rentalType,
      channelType: data.channelType,
      assignedAt: now,
      endedAt: null,
    }));
    await WhatsappChannelAssignment.insertMany(assignmentDocs, session ? { session } : {});
  }

  return channel;
}
