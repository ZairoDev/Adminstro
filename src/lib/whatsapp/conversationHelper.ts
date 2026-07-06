import mongoose from "mongoose";
import WhatsAppConversation, {
  IWhatsAppConversation,
} from "@/models/whatsappConversation";
import { locationKeyFromDisplay } from "@/lib/whatsapp/locationAccess";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import {
  getActiveChannelByPhoneNumberId,
  getChannelByPhoneNumberId,
  inferChannelTypeFromConversation,
  normalizeStoredWabaId,
  resolveWhatsappChannel,
  type ResolvedChannel,
} from "@/lib/whatsapp/channelService";
import type { WhatsAppChannelRentalType } from "@/lib/whatsapp/rentalTypeAccess";
import type { WhatsappChannelType } from "@/models/whatsappChannel";
import WhatsappChannel from "@/models/whatsappChannel";
import { MESSAGING_WINDOW_MS } from "@/lib/whatsapp/messagingWindow";

type SnapshotSource = "trusted" | "untrusted";

interface ConversationSnapshotInput {
  participantPhone: string;
  businessPhoneId: string;
  /** Stable business identity — primary lookup key with participantPhone */
  whatsappChannelId?: mongoose.Types.ObjectId | string;
  participantName?: string;
  participantLocation?: string;
  conversationType?: "owner" | "guest";
  participantProfilePic?: string;
  referenceLink?: string;
  rentalType?: WhatsAppChannelRentalType;
  channelType?: WhatsappChannelType;
  snapshotSource?: SnapshotSource;
  isInboundWebhook?: boolean;
  /** Meta inbound message time (ms) — used on create to avoid server-time race */
  inboundTimestampMs?: number;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}

function logConversationDecision(
  action: "reused_primary" | "reused_legacy" | "created_new",
  params: {
    participantPhone: string;
    whatsappChannelId: string | null;
    businessPhoneId: string;
    conversationId: unknown;
  },
): void {
  console.log("[conversationHelper]", {
    action,
    participantPhone: params.participantPhone,
    whatsappChannelId: params.whatsappChannelId,
    businessPhoneId: params.businessPhoneId,
    conversationId: params.conversationId,
  });
}

async function resolveChannelForInput(
  input: ConversationSnapshotInput,
  effectiveChannelType: WhatsappChannelType | undefined,
): Promise<ResolvedChannel | null> {
  if (input.whatsappChannelId) {
    const byId = await WhatsappChannel.findById(input.whatsappChannelId).lean();
    if (byId) {
      return {
        channelId: String(byId._id),
        name: byId.name,
        channelType: byId.channelType,
        phoneNumberId: byId.phoneNumberId,
        displayPhoneNumber: byId.displayPhoneNumber || "",
        accessToken: byId.accessToken || "",
        wabaId: byId.wabaId || "",
        wabaName: byId.wabaName || "",
        businessPortfolioId: byId.businessPortfolioId || "",
        businessPortfolioName: byId.businessPortfolioName || "",
        rentalType: byId.rentalType,
        active: byId.active,
      };
    }
  }

  if (input.isInboundWebhook) {
    return getActiveChannelByPhoneNumberId(input.businessPhoneId);
  }

  if (input.participantLocation && input.rentalType) {
    const routed = await resolveWhatsappChannel({
      location: input.participantLocation,
      rentalType: input.rentalType,
      channelType: effectiveChannelType ?? null,
    });
    if (routed) return routed;
  }

  return (
    (await getActiveChannelByPhoneNumberId(input.businessPhoneId)) ??
    (await getChannelByPhoneNumberId(input.businessPhoneId))
  );
}

function channelStampFields(
  channel: ResolvedChannel,
  effectiveChannelType: WhatsappChannelType | undefined,
): {
  whatsappChannelId: mongoose.Types.ObjectId;
  channelType?: WhatsappChannelType;
  rentalType?: WhatsAppChannelRentalType;
  businessPortfolioId?: string;
  wabaId?: string;
} {
  return {
    whatsappChannelId: new mongoose.Types.ObjectId(channel.channelId),
    channelType: effectiveChannelType ?? channel.channelType,
    rentalType: channel.rentalType,
    businessPortfolioId: channel.businessPortfolioId || undefined,
    wabaId:
      normalizeStoredWabaId(channel.wabaId, channel.businessPortfolioId) ||
      undefined,
  };
}

async function applySnapshotUpdates(
  conversation: IWhatsAppConversation,
  input: ConversationSnapshotInput,
): Promise<IWhatsAppConversation> {
  const {
    participantName,
    participantLocation,
    conversationType,
    participantProfilePic,
    referenceLink,
    snapshotSource = "untrusted",
  } = input;

  const updates: Partial<IWhatsAppConversation> = {};

  if (snapshotSource === "trusted") {
    if (!conversation.participantName && participantName) {
      updates.participantName = participantName;
    }
    if (!conversation.participantLocation && participantLocation) {
      updates.participantLocation = participantLocation;
      updates.participantLocationKey = locationKeyFromDisplay(participantLocation);
    }
    if (!conversation.conversationType && conversationType) {
      updates.conversationType = conversationType;
    }
    if (!conversation.referenceLink && referenceLink) {
      updates.referenceLink = referenceLink;
    }
    if (participantProfilePic) {
      updates.participantProfilePic = participantProfilePic;
    }
  } else if (participantProfilePic) {
    updates.participantProfilePic = participantProfilePic;
  }

  if (Object.keys(updates).length === 0) {
    return conversation;
  }

  return (await WhatsAppConversation.findByIdAndUpdate(
    conversation._id,
    updates,
    { new: true },
  )) as IWhatsAppConversation;
}

async function syncBusinessPhoneId(
  conversation: IWhatsAppConversation,
  businessPhoneId: string,
): Promise<IWhatsAppConversation> {
  if (conversation.businessPhoneId === businessPhoneId) {
    return conversation;
  }
  return (await WhatsAppConversation.findByIdAndUpdate(
    conversation._id,
    { $set: { businessPhoneId } },
    { new: true },
  )) as IWhatsAppConversation;
}

/**
 * Create-or-reuse helper for WhatsAppConversation with snapshot semantics.
 *
 * Identity (permanent): { participantPhone, whatsappChannelId }
 * Runtime reference (mutable): businessPhoneId
 */
export async function findOrCreateConversationWithSnapshot(
  input: ConversationSnapshotInput,
): Promise<IWhatsAppConversation> {
  const {
    businessPhoneId,
    participantName,
    participantLocation,
    conversationType,
    participantProfilePic,
    referenceLink,
    rentalType,
    channelType,
    snapshotSource = "untrusted",
  } = input;

  const normalizedPhone = normalizePhone(input.participantPhone);
  const effectiveChannelType =
    channelType ??
    inferChannelTypeFromConversation({ conversationType }) ??
    undefined;

  const channel = await resolveChannelForInput(input, effectiveChannelType);
  const resolvedChannelId = input.whatsappChannelId
    ? String(input.whatsappChannelId)
    : channel?.channelId ?? null;

  // STEP 1 — primary: participantPhone + whatsappChannelId
  if (resolvedChannelId) {
    let conversation = await WhatsAppConversation.findOne({
      participantPhone: normalizedPhone,
      whatsappChannelId: resolvedChannelId,
    });

    if (conversation) {
      conversation = await syncBusinessPhoneId(conversation, businessPhoneId);
      logConversationDecision("reused_primary", {
        participantPhone: normalizedPhone,
        whatsappChannelId: resolvedChannelId,
        businessPhoneId,
        conversationId: conversation._id,
      });
      return applySnapshotUpdates(conversation, input);
    }
  }

  // STEP 2 — legacy fallback: participantPhone + businessPhoneId
  let conversation = await WhatsAppConversation.findOne({
    participantPhone: normalizedPhone,
    businessPhoneId,
  });

  if (conversation) {
    const legacyUpdates: Partial<IWhatsAppConversation> = {
      businessPhoneId,
    };

    if (!conversation.whatsappChannelId && resolvedChannelId) {
      console.log(
        "[conversationHelper] legacy fallback hit — backfilling whatsappChannelId",
        {
          conversationId: conversation._id,
          whatsappChannelId: resolvedChannelId,
        },
      );
      legacyUpdates.whatsappChannelId = new mongoose.Types.ObjectId(
        resolvedChannelId,
      );
      if (channel) {
        Object.assign(legacyUpdates, channelStampFields(channel, effectiveChannelType));
      }
      legacyUpdates.identityVersion = 2;
    }

    conversation = (await WhatsAppConversation.findByIdAndUpdate(
      conversation._id,
      { $set: legacyUpdates },
      { new: true },
    )) as IWhatsAppConversation;

    logConversationDecision("reused_legacy", {
      participantPhone: normalizedPhone,
      whatsappChannelId: resolvedChannelId,
      businessPhoneId,
      conversationId: conversation._id,
    });
    return applySnapshotUpdates(conversation, input);
  }

  // STEP 3 — create
  if (!resolvedChannelId) {
    console.error(
      "[conversationHelper] cannot create conversation — whatsappChannelId not resolved",
      { participantPhone: normalizedPhone, businessPhoneId },
    );
    throw new Error("whatsappChannelId required for conversation creation");
  }

  const locKey = participantLocation
    ? locationKeyFromDisplay(participantLocation)
    : "";
  const now = new Date();
  const inboundAnchor =
    input.isInboundWebhook && input.inboundTimestampMs
      ? new Date(input.inboundTimestampMs)
      : null;
  const messageTime = inboundAnchor ?? now;

  const createPayload: Record<string, unknown> = {
    participantPhone: normalizedPhone,
    participantName: participantName || `+${normalizedPhone}`,
    participantLocation: participantLocation || "",
    participantLocationKey: locKey,
    conversationType,
    participantProfilePic: participantProfilePic || undefined,
    businessPhoneId,
    status: "active",
    unreadCount: 0,
    referenceLink: referenceLink || undefined,
    lastMessageTime: messageTime,
    firstMessageTime: messageTime,
    identityVersion: 2,
    ...(inboundAnchor
      ? {
          lastCustomerMessageAt: inboundAnchor,
          lastIncomingMessageTime: inboundAnchor,
          sessionExpiresAt: new Date(
            input.inboundTimestampMs! + MESSAGING_WINDOW_MS,
          ),
          [`lastCustomerMessageAtByPhone.${businessPhoneId}`]: inboundAnchor,
        }
      : {}),
    ...(channel
      ? channelStampFields(channel, effectiveChannelType)
      : {
          whatsappChannelId: new mongoose.Types.ObjectId(resolvedChannelId),
          ...(rentalType ? { rentalType } : {}),
          ...(effectiveChannelType ? { channelType: effectiveChannelType } : {}),
        }),
  };

  try {
    conversation = await WhatsAppConversation.create(createPayload);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const raced = await WhatsAppConversation.findOne({
        participantPhone: normalizedPhone,
        whatsappChannelId: resolvedChannelId,
      });
      if (!raced) throw err;
      conversation = raced;
      conversation = await syncBusinessPhoneId(conversation, businessPhoneId);
      logConversationDecision("reused_primary", {
        participantPhone: normalizedPhone,
        whatsappChannelId: resolvedChannelId,
        businessPhoneId,
        conversationId: conversation._id,
      });
      return applySnapshotUpdates(conversation, input);
    }
    throw err;
  }

  logConversationDecision("created_new", {
    participantPhone: normalizedPhone,
    whatsappChannelId: resolvedChannelId,
    businessPhoneId,
    conversationId: conversation._id,
  });

  return conversation;
}
