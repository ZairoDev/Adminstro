import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  WHATSAPP_API_BASE_URL,
} from "@/lib/whatsapp/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import {
  getActiveChannelByPhoneNumberId,
  getChannelByPhoneNumberId,
  normalizeStoredWabaId,
  resolveCredentialChannelForConversation,
  resolveOutboundChannelForConversation,
  resolveWabaIdFromPhoneNumberId,
  resolveWhatsappChannel,
  inferChannelTypeFromConversation,
  toOutboundTokenConversation,
} from "@/lib/whatsapp/channelService";
import mongoose from "mongoose";
import { canAccessConversationAsync, CONVERSATION_ACCESS_SELECT } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import {
  getUserAreasFromToken,
  locationKeyFromDisplay,
  normalizeAreas,
} from "@/lib/whatsapp/locationAccess";
import { resolveConversationRentalType } from "@/lib/whatsapp/rentalTypeAccess";

export const dynamic = "force-dynamic";

type WabaResolution = {
  wabaId: string | null;
  accessToken: string;
  channelScoped: boolean;
  phoneNumberId: string | null;
  source: string;
};

function isInvalidWabaGraphError(data: unknown): boolean {
  const err = (data as { error?: { code?: number; error_subcode?: number } })?.error;
  return err?.code === 100 && err?.error_subcode === 33;
}

function isMetaTokenInvalidated(data: unknown): boolean {
  const err = (data as { error?: { code?: number; error_subcode?: number } })?.error;
  return err?.code === 190 && err?.error_subcode === 460;
}

async function applyChannelToResolution(
  resolution: WabaResolution,
  channel: {
    phoneNumberId?: string;
    accessToken?: string;
    wabaId?: string;
    businessPortfolioId?: string;
  },
  source: string,
  fallbackPhoneId?: string | null,
): Promise<void> {
  resolution.phoneNumberId =
    channel.phoneNumberId?.trim() || fallbackPhoneId?.trim() || resolution.phoneNumberId;
  if (channel.accessToken?.trim()) {
    resolution.accessToken = channel.accessToken.trim();
  }
  const channelWaba = normalizeStoredWabaId(channel.wabaId, channel.businessPortfolioId);
  if (channelWaba) {
    resolution.wabaId = channelWaba;
    resolution.channelScoped = true;
    resolution.source = source;
  }
}

async function resolveAreaRoutedChannelForConversation(
  conv: {
    participantLocationKey?: string;
    participantLocation?: string;
    rentalType?: string;
    channelType?: "guest" | "owner" | "support" | "backup";
    conversationType?: "guest" | "owner";
  },
  userToken: WhatsAppToken,
) {
  const userAreas = normalizeAreas(getUserAreasFromToken(userToken));
  const locationKey =
    conv.participantLocationKey?.trim() ||
    (conv.participantLocation?.trim()
      ? locationKeyFromDisplay(conv.participantLocation)
      : "") ||
    userAreas[0] ||
    "";

  if (!locationKey) return null;

  return resolveWhatsappChannel({
    location: locationKey,
    rentalType: resolveConversationRentalType(conv.rentalType),
    channelType: inferChannelTypeFromConversation({
      channelType: conv.channelType,
      conversationType: conv.conversationType,
    }),
  });
}

async function fetchTemplatesFromMeta(
  wabaId: string,
  accessToken: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(
    `${WHATSAPP_API_BASE_URL}/${wabaId}/message_templates`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * GET /api/whatsapp/templates
 *
 * WABA + token resolution (operational — not historical):
 *   1. Current WhatsappChannel via location + guest/owner routing
 *   2. Active channel for resolved phoneNumberId
 *   3. Meta API: phone_number_id → whatsapp_business_account
 *   4. Frozen conversation snapshot only when routing has no match
 *
 * Legacy conversations keep frozen whatsappChannelId for history, but templates
 * always use the current operational channel/WABA after a migration.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const conversationId = params.get("conversationId")?.trim();
    const phoneNumberIdParam = params.get("phoneNumberId")?.trim();
    const explicitWabaId = params.get("wabaId")?.trim();

    if (!conversationId && !phoneNumberIdParam && !explicitWabaId) {
      return NextResponse.json({
        success: true,
        templates: [],
        channelScoped: false,
      });
    }

    const normalizedToken = normalizeWhatsAppToken(token as WhatsAppToken);

    let resolution: WabaResolution = {
      wabaId: null,
      accessToken: "",
      channelScoped: false,
      phoneNumberId: phoneNumberIdParam || null,
      source: "none",
    };

    if (conversationId && mongoose.isValidObjectId(conversationId)) {
      await connectDb();
      const conv = await WhatsAppConversation.findById(conversationId)
        .select(`${CONVERSATION_ACCESS_SELECT} wabaId businessPortfolioId`)
        .lean() as {
          whatsappChannelId?: mongoose.Types.ObjectId;
          businessPhoneId?: string;
          wabaId?: string;
          businessPortfolioId?: string;
          participantLocation?: string;
          participantLocationKey?: string;
          rentalType?: string;
          channelType?: "guest" | "owner" | "support" | "backup";
          conversationType?: "guest" | "owner";
          isRetarget?: boolean;
        } | null;

      if (conv) {
        if (
          !(await canAccessConversationAsync(
            normalizedToken,
            conv as Record<string, unknown>,
          ))
        ) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const tokenContext = toOutboundTokenConversation(conv);
        const { channel, source } = tokenContext
          ? await resolveOutboundChannelForConversation(tokenContext)
          : { channel: null, source: "none" };

        const operational =
          channel ??
          (tokenContext
            ? await resolveCredentialChannelForConversation(tokenContext)
            : null);

        if (operational) {
          await applyChannelToResolution(
            resolution,
            operational,
            source !== "none" ? source : "operational_channel",
            conv.businessPhoneId,
          );
        } else {
          resolution.phoneNumberId = conv.businessPhoneId?.trim() || resolution.phoneNumberId;
        }

        if (!resolution.wabaId && resolution.phoneNumberId && resolution.accessToken) {
          const metaWaba = await resolveWabaIdFromPhoneNumberId(
            resolution.phoneNumberId,
            resolution.accessToken,
          );
          if (metaWaba) {
            resolution.wabaId = metaWaba;
            resolution.channelScoped = true;
            resolution.source = "meta_phone";
          }
        }

        if (!resolution.wabaId) {
          const convWaba = normalizeStoredWabaId(conv.wabaId, conv.businessPortfolioId);
          if (convWaba) {
            resolution.wabaId = convWaba;
            resolution.channelScoped = true;
            resolution.source = "conversation_snapshot";
          }
        }

        if (!resolution.wabaId || !resolution.accessToken) {
          const areaRouted = await resolveAreaRoutedChannelForConversation(
            conv,
            normalizedToken,
          );
          if (areaRouted) {
            await applyChannelToResolution(
              resolution,
              areaRouted,
              "area_routed_channel",
              conv.businessPhoneId,
            );
          }
        }
      }
    } else if (phoneNumberIdParam) {
      const channel =
        (await getActiveChannelByPhoneNumberId(phoneNumberIdParam)) ??
        (await getChannelByPhoneNumberId(phoneNumberIdParam));

      if (channel) {
        resolution.accessToken = channel.accessToken?.trim() || "";
        const channelWaba = normalizeStoredWabaId(
          channel.wabaId,
          channel.businessPortfolioId,
        );
        if (channelWaba) {
          resolution.wabaId = channelWaba;
          resolution.channelScoped = true;
          resolution.source = "channel";
        }
      }

      // NO env fallback: if the channel row has no accessToken, we can't
      // talk to Meta for this phone line. Return empty templates.

      if (!resolution.wabaId && resolution.accessToken) {
        const metaWaba = await resolveWabaIdFromPhoneNumberId(
          phoneNumberIdParam,
          resolution.accessToken,
        );
        if (metaWaba) {
          resolution.wabaId = metaWaba;
          resolution.channelScoped = true;
          resolution.source = "meta_phone";
        }
      }
    } else if (explicitWabaId) {
      resolution.wabaId = explicitWabaId;
      resolution.source = "query_param";
    }

    // NO env fallback: templates must be resolved from a configured channel
    // (or Meta-resolved WABA using the channel token).
    if (!resolution.wabaId || !resolution.accessToken) {
      return NextResponse.json(
        {
          success: true,
          templates: [],
          channelScoped: resolution.channelScoped,
          wabaId: resolution.wabaId,
          wabaSource: resolution.source,
          metaUnavailable: true,
          code: "NO_CHANNEL_CONTEXT",
          warning:
            "No WhatsApp channel token is configured for this conversation. Set the chat location or configure the channel in WhatsApp Channels admin.",
        },
        { status: 200 },
      );
    }

    let fetchResult = await fetchTemplatesFromMeta(resolution.wabaId, resolution.accessToken);

    // Stored WABA invalid — resolve from phone via Meta and retry once.
    if (!fetchResult.ok && isInvalidWabaGraphError(fetchResult.data)) {
      const phoneId = resolution.phoneNumberId;
      if (phoneId) {
        const metaWaba = await resolveWabaIdFromPhoneNumberId(phoneId, resolution.accessToken);
        if (metaWaba && metaWaba !== resolution.wabaId) {
          console.warn("[whatsapp/templates] retrying with Meta-resolved WABA", {
            badWabaId: resolution.wabaId,
            metaWabaId: metaWaba,
            previousSource: resolution.source,
            phoneNumberId: phoneId,
            conversationId: conversationId ?? null,
          });
          resolution.wabaId = metaWaba;
          resolution.source = "meta_phone_retry";
          resolution.channelScoped = true;
          fetchResult = await fetchTemplatesFromMeta(metaWaba, resolution.accessToken);
        }
      }

      // IMPORTANT: No env fallback retry.
    }

    if (!fetchResult.ok) {
      console.error("[whatsapp/templates] upstream error:", {
        wabaId: resolution.wabaId,
        source: resolution.source,
        channelScoped: resolution.channelScoped,
        phoneNumberId: resolution.phoneNumberId,
        conversationId: conversationId ?? null,
        data: fetchResult.data,
      });

      const upstreamMsg =
        (fetchResult.data as { error?: { message?: string } })?.error?.message ||
        "Failed to fetch templates";

      // IMPORTANT: Meta token failures are upstream errors, not user auth errors.
      // Never return 401 here — the frontend treats 401 as "log out".
      if (fetchResult.status === 401 && isMetaTokenInvalidated(fetchResult.data)) {
        return NextResponse.json(
          {
            success: true,
            templates: [],
            channelScoped: resolution.channelScoped,
            wabaId: resolution.wabaId,
            wabaSource: resolution.source,
            metaUnavailable: true,
            code: "META_TOKEN_INVALID",
            warning:
              "Meta access token is invalid or expired for this channel. Update the token in WhatsApp Channels admin.",
            upstreamMessage: upstreamMsg,
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          error: upstreamMsg,
          code: "META_UPSTREAM_ERROR",
          wabaId: resolution.wabaId,
          wabaSource: resolution.source,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      templates: (fetchResult.data as { data?: unknown[] })?.data || [],
      wabaId: resolution.wabaId,
      wabaSource: resolution.source,
      channelScoped: resolution.channelScoped,
    });
  } catch (error: unknown) {
    console.error("[whatsapp/templates] error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
