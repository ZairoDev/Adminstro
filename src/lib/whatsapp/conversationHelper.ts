import WhatsAppConversation, {
  IWhatsAppConversation,
} from "@/models/whatsappConversation";
import { locationKeyFromDisplay } from "@/lib/whatsapp/locationAccess";
import {
  getActiveChannelByPhoneNumberId,
  getChannelByPhoneNumberId,
  inferChannelTypeFromConversation,
  normalizeStoredWabaId,
  resolveWhatsappChannel,
} from "@/lib/whatsapp/channelService";
import type { WhatsAppChannelRentalType } from "@/lib/whatsapp/rentalTypeAccess";
import type { WhatsappChannelType } from "@/models/whatsappChannel";

type SnapshotSource = "trusted" | "untrusted";

interface ConversationSnapshotInput {
  participantPhone: string;
  businessPhoneId: string;
  participantName?: string;
  participantLocation?: string;
  conversationType?: "owner" | "guest";
  participantProfilePic?: string;
  referenceLink?: string;
  rentalType?: WhatsAppChannelRentalType;
  channelType?: WhatsappChannelType;
  // Source of this data:
  // - 'trusted'   = lead creation / manual add guest (outbound create flow)
  // - 'untrusted' = inbound webhooks, retarget, background jobs
  snapshotSource?: SnapshotSource;
  // When true, use the inbound-safe phoneNumberId lookup instead of
  // outbound location+rentalType routing. Must be set for webhook paths.
  isInboundWebhook?: boolean;
}

/**
 * Create-or-reuse helper for WhatsAppConversation with snapshot semantics.
 *
 * Invariants:
 * - One conversation per (participantPhone, businessPhoneId).
 * - Snapshot identity fields (name/location/type/referenceLink) are only set:
 *   - at creation time, OR
 *   - when currently empty AND the source is 'trusted'.
 * - Channel fields (whatsappChannelId, channelType, businessPortfolioId, wabaId,
 *   rentalType) are FROZEN at creation. They are never updated on existing conversations.
 * - Inbound webhooks must pass isInboundWebhook: true so channel is resolved via
 *   getActiveChannelByPhoneNumberId(phoneNumberId) — race-condition safe.
 * - Outbound trusted flows may pass location + rentalType + channelType for routing.
 */
export async function findOrCreateConversationWithSnapshot(
  input: ConversationSnapshotInput
): Promise<IWhatsAppConversation> {
  const {
    participantPhone,
    businessPhoneId,
    participantName,
    participantLocation,
    conversationType,
    participantProfilePic,
    referenceLink,
    rentalType,
    channelType,
    snapshotSource = "untrusted",
    isInboundWebhook = false,
  } = input;

  const effectiveChannelType =
    channelType ??
    inferChannelTypeFromConversation({ conversationType }) ??
    undefined;

  // Primary lookup: canonical (participantPhone, businessPhoneId) pair.
  let conversation = await WhatsAppConversation.findOne({
    participantPhone,
    businessPhoneId,
  });

  // Channel-migration fallback: when a number migrates to a new phoneNumberId the old
  // businessPhoneId no longer matches, but the whatsappChannelId is stable.
  // Resolve the channel first (cheap DB read) and try to find an existing conversation
  // frozen to that channel before creating a duplicate.
  if (!conversation) {
    let channelIdForLookup: string | null = null;

    if (isInboundWebhook) {
      const ch = await getActiveChannelByPhoneNumberId(businessPhoneId);
      if (ch) channelIdForLookup = ch.channelId;
    } else if (participantLocation && rentalType) {
      const ch = await resolveWhatsappChannel({
        location: participantLocation,
        rentalType,
        channelType: effectiveChannelType ?? null,
      });
      if (ch) channelIdForLookup = ch.channelId;
    }

    if (!channelIdForLookup) {
      const ch = await getChannelByPhoneNumberId(businessPhoneId);
      if (ch) channelIdForLookup = ch.channelId;
    }

    if (channelIdForLookup) {
      const channelConv = await WhatsAppConversation.findOne({
        participantPhone,
        whatsappChannelId: channelIdForLookup,
      });
      if (channelConv) {
        // Found via channel fallback — backfill the new businessPhoneId so future
        // primary lookups succeed without hitting this fallback path again.
        if (channelConv.businessPhoneId !== businessPhoneId) {
          await WhatsAppConversation.updateOne(
            { _id: channelConv._id },
            { $set: { businessPhoneId } },
          );
          channelConv.businessPhoneId = businessPhoneId;
        }
        conversation = channelConv;
      }
    }
  }

  if (!conversation) {
    const locKey = participantLocation ? locationKeyFromDisplay(participantLocation) : "";
    const now = new Date();

    // Resolve channel to stamp frozen snapshot fields on the new conversation.
    // Inbound: use phoneNumberId lookup only (race-condition safe).
    // Outbound/trusted: prefer location+rentalType+channelType, then phone fallback.
    let channelFields: {
      whatsappChannelId?: string;
      channelType?: WhatsappChannelType;
      rentalType?: WhatsAppChannelRentalType;
      businessPortfolioId?: string;
      wabaId?: string;
    } = {};

    try {
      let channel = null;

      if (isInboundWebhook) {
        // Inbound path: resolve by phone number only.
        channel = await getActiveChannelByPhoneNumberId(businessPhoneId);
      } else if (participantLocation && rentalType) {
        // Outbound path: resolve by location + rentalType + guest/owner channelType.
        channel = await resolveWhatsappChannel({
          location: participantLocation,
          rentalType,
          channelType: effectiveChannelType ?? null,
        });
      }

      // Final fallback: look up by phone number (handles legacy or channel-less cases).
      if (!channel) {
        channel = await getChannelByPhoneNumberId(businessPhoneId);
      }

      if (channel) {
        channelFields = {
          whatsappChannelId: channel.channelId,
          channelType: effectiveChannelType ?? channel.channelType,
          rentalType: channel.rentalType,
          businessPortfolioId: channel.businessPortfolioId || undefined,
          wabaId:
            normalizeStoredWabaId(channel.wabaId, channel.businessPortfolioId) ||
            undefined,
        };
      } else {
        // No channel found — preserve whatever was passed in.
        if (rentalType) channelFields.rentalType = rentalType;
        if (effectiveChannelType) channelFields.channelType = effectiveChannelType;
      }
    } catch {
      if (rentalType) channelFields = { rentalType };
      if (effectiveChannelType) channelFields.channelType = effectiveChannelType;
    }

    conversation = await WhatsAppConversation.create({
      participantPhone,
      participantName: participantName || `+${participantPhone}`,
      participantLocation: participantLocation || "",
      participantLocationKey: locKey,
      conversationType: conversationType,
      participantProfilePic: participantProfilePic || undefined,
      businessPhoneId,
      status: "active",
      unreadCount: 0,
      referenceLink: referenceLink || undefined,
      lastMessageTime: now,
      firstMessageTime: now,
      ...channelFields,
    });
    return conversation;
  }

  // Existing conversation: only backfill empty snapshot fields from trusted sources.
  // Channel fields are NEVER updated on existing conversations (frozen at creation).
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

  if (Object.keys(updates).length > 0) {
    conversation = await WhatsAppConversation.findByIdAndUpdate(
      conversation._id,
      updates,
      { new: true }
    ) as IWhatsAppConversation;
  }

  return conversation;
}
