import WhatsAppConversation, {
  IWhatsAppConversation,
} from "@/models/whatsappConversation";

type SnapshotSource = "trusted" | "untrusted";

interface ConversationSnapshotInput {
  participantPhone: string;
  businessPhoneId: string;
  participantName?: string;
  participantLocation?: string;
  participantRole?: "owner" | "guest";
  participantProfilePic?: string; // Lead/client profile picture URL
  referenceLink?: string;
  // Source of this data:
  // - 'trusted'  = lead creation / manual add guest
  // - 'untrusted' = retarget, webhooks, background jobs, etc.
  snapshotSource?: SnapshotSource;
}

/**
 * Create-or-reuse helper for WhatsAppConversation with snapshot semantics.
 *
 * Invariants:
 * - One conversation per (participantPhone, businessPhoneId).
 * - Snapshot identity fields (name/location/role/referenceLink) are only set:
 *   - at creation time, OR
 *   - when currently empty AND the source is 'trusted'.
 * - Retargeting / background flows must pass snapshotSource: 'untrusted'
 *   so they never overwrite existing snapshots.
 */
export async function findOrCreateConversationWithSnapshot(
  input: ConversationSnapshotInput
): Promise<IWhatsAppConversation> {
  const {
    participantPhone,
    businessPhoneId,
    participantName,
    participantLocation,
    participantRole,
    participantProfilePic,
    referenceLink,
    snapshotSource = "untrusted",
  } = input;

  let conversation = await WhatsAppConversation.findOne({
    participantPhone,
    businessPhoneId,
  });

  if (!conversation) {
    // New conversation: we are allowed to set full snapshot
    conversation = await WhatsAppConversation.create({
      participantPhone,
      participantName: participantName || `+${participantPhone}`,
      participantLocation: participantLocation || "",
      participantRole: participantRole,
      participantProfilePic: participantProfilePic || undefined,
      businessPhoneId,
      status: "active",
      unreadCount: 0,
      referenceLink: referenceLink || undefined,
    });
    return conversation;
  }

  // Existing conversation: only backfill empty snapshot fields from trusted sources
  const updates: Partial<IWhatsAppConversation> = {};

  if (snapshotSource === "trusted") {
    if (!conversation.participantName && participantName) {
      updates.participantName = participantName;
    }

    if (!conversation.participantLocation && participantLocation) {
      updates.participantLocation = participantLocation;
    }

    if (!conversation.participantRole && participantRole) {
      updates.participantRole = participantRole;
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

