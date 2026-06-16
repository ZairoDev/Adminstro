import {

  INTERNAL_YOU_PHONE_ID,

  isInternalPhoneId,

  getDefaultPhoneId,

  getRetargetPhoneId,

} from "./config";

import { canAccessConversationAsync } from "./access";

import type { WhatsAppToken } from "./apiContext";

import { normalizeWhatsAppToken } from "./apiContext";

import {
  canUserAccessPhoneId,
  getAccessibleChannelIds,
} from "./phoneAreaConfigService";

import {

  inferChannelTypeFromConversation,

  resolveOutboundChannelForConversation,

  resolveWhatsappChannel,

} from "./channelService";

import type { WhatsappChannelType } from "@/models/whatsappChannel";



type ConversationLike = {

  businessPhoneId?: string;

  source?: string;

  isRetarget?: boolean;

  retargetStage?: string;

  whatsappChannelId?: string;

  participantLocation?: string;

  participantLocationKey?: string;

  rentalType?: string;

  channelType?: WhatsappChannelType;

  conversationType?: "owner" | "guest";

};



export type OutboundPhoneResult =

  | {

      phoneNumberId: string;

      source:

        | "conversation"

        | "request"

        | "default"

        | "retarget"

        | "frozen_channel"

        | "channel_routing"

        | "phone_lookup"

        | "retarget_line";

    }

  | { error: string; status: number };



/**

 * Unified outbound line resolution.

 *

 * For open conversations, resolves the sending phone via:

 *   1. Active channel matching current location + rentalType + guest/owner channelType

 *   2. Frozen whatsappChannelId (when location routing has no match)

 *   3. Legacy businessPhoneId lookup

 *

 * Client-selected inbox tabs are not used in unified inbox mode.

 */

export async function resolveOutboundBusinessPhoneId(params: {

  token: WhatsAppToken;

  conversation?: ConversationLike | null;

  requestedPhoneId?: string | null;

  requireConversation?: boolean;

}): Promise<OutboundPhoneResult> {

  const token = normalizeWhatsAppToken(params.token);

  const userRole = token.role || "";

  const userAreas = token.allotedArea;



  if (params.conversation) {

    const conv = params.conversation;

    const allowed = await canAccessConversationAsync(

      token,

      conv as Record<string, unknown>,

    );

    if (!allowed) {

      return { error: "Forbidden", status: 403 };

    }



    if (
      (conv.businessPhoneId && isInternalPhoneId(conv.businessPhoneId)) ||
      conv.source === "internal"
    ) {

      return { phoneNumberId: INTERNAL_YOU_PHONE_ID, source: "conversation" };

    }



    const { channel, source } = await resolveOutboundChannelForConversation(conv);

    const expectedChannelType = inferChannelTypeFromConversation({
      channelType: conv.channelType as "guest" | "owner" | null | undefined,
      conversationType: conv.conversationType as "guest" | "owner" | null | undefined,
    });

    if (channel?.phoneNumberId) {
      if (
        expectedChannelType &&
        channel.channelType !== expectedChannelType &&
        source === "phone_lookup"
      ) {
        return {
          error: `WhatsApp ${expectedChannelType} channel not configured for this conversation's location and rental type`,
          status: 404,
        };
      }

      let canUse = await canUserAccessPhoneId(

        channel.phoneNumberId,

        userRole,

        userAreas,

        { userRentalType: token.rentalType },

      );

      if (
        !canUse &&
        !(userRole === "Advert" && conv.isRetarget)
      ) {
        const accessibleChannelIds = await getAccessibleChannelIds(
          userRole,
          userAreas,
          token.rentalType,
        );
        const frozenId = conv.whatsappChannelId
          ? String(conv.whatsappChannelId)
          : "";
        const resolvedChannelId = channel.channelId
          ? String(channel.channelId)
          : "";
        if (
          (frozenId && accessibleChannelIds.includes(frozenId)) ||
          (resolvedChannelId && accessibleChannelIds.includes(resolvedChannelId))
        ) {
          canUse = true;
        }
      }

      if (!canUse && !(userRole === "Advert" && conv.isRetarget)) {

        return {

          error: "You don't have permission to send from this WhatsApp number",

          status: 403,

        };

      }

      const resolvedSource =
        source === "frozen_channel" ||
        source === "channel_routing" ||
        source === "phone_lookup" ||
        source === "retarget_line"
          ? source
          : "conversation";

      return {
        phoneNumberId: channel.phoneNumberId,
        source: resolvedSource,
      };

    }



    if (expectedChannelType) {
      const location =
        conv.participantLocation?.trim() ||
        conv.participantLocationKey?.trim() ||
        "";
      const rentalType = conv.rentalType;
      return {
        error:
          location && rentalType
            ? `No active WhatsApp ${expectedChannelType} channel for ${location} (${rentalType})`
            : `No active WhatsApp ${expectedChannelType} channel configured for this conversation`,
        status: 404,
      };
    }

    const line = conv.businessPhoneId?.trim();

    if (!line) {

      return { error: "Conversation has no business phone line", status: 400 };

    }

    return { phoneNumberId: line, source: "conversation" };

  }



  if (params.requireConversation) {

    return { error: "conversationId is required", status: 400 };

  }



  let phoneNumberId = params.requestedPhoneId?.trim() || "";

  if (!phoneNumberId) {

    phoneNumberId = getDefaultPhoneId(userRole, userAreas) || "";

  }



  if (!phoneNumberId && userRole === "Advert") {

    phoneNumberId = getRetargetPhoneId() || "";

  }



  if (!phoneNumberId) {

    return { error: "No WhatsApp line available for send", status: 403 };

  }



  const canUsePhone = await canUserAccessPhoneId(phoneNumberId, userRole, userAreas, {

    userRentalType: token.rentalType,

  });

  if (!canUsePhone && !(userRole === "Advert" && phoneNumberId === getRetargetPhoneId())) {

    return {

      error: "You don't have permission to send from this WhatsApp number",

      status: 403,

    };

  }



  const source = params.requestedPhoneId ? "request" : "default";

  return { phoneNumberId, source };

}



/**

 * Resolve outbound phone for a new contact before a conversation exists.

 * Requires location; uses rentalType + guest/owner channelType triple routing.

 */

export async function resolveOutboundPhoneForNewContact(params: {

  token: WhatsAppToken;

  location: string;

  rentalType: string;

  conversationType?: "owner" | "guest";

  channelType?: WhatsappChannelType | null;

  requestedPhoneId?: string | null;

}): Promise<OutboundPhoneResult> {

  const token = normalizeWhatsAppToken(params.token);

  const userRole = token.role || "";

  const userAreas = token.allotedArea;



  const channelType = inferChannelTypeFromConversation({

    channelType: params.channelType,

    conversationType: params.conversationType,

  });



  const channel = await resolveWhatsappChannel({

    location: params.location,

    rentalType: params.rentalType,

    channelType,

  });



  let phoneNumberId = channel?.phoneNumberId || params.requestedPhoneId?.trim() || "";

  if (!phoneNumberId) {

    return {

      error: `No active WhatsApp channel for ${params.location} (${params.rentalType}${channelType ? `, ${channelType}` : ""})`,

      status: 404,

    };

  }



  const canUse = await canUserAccessPhoneId(phoneNumberId, userRole, userAreas, {

    userRentalType: token.rentalType,

  });

  if (!canUse) {

    return {

      error: "You don't have permission to send from this WhatsApp number",

      status: 403,

    };

  }



  return { phoneNumberId, source: channel ? "channel_routing" : "request" };

}


