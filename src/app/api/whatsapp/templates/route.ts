import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  getWhatsAppToken,
  WHATSAPP_API_BASE_URL,
  WHATSAPP_BUSINESS_ACCOUNT_ID,
} from "@/lib/whatsapp/config";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import {
  getActiveChannelByPhoneNumberId,
  getChannelByPhoneNumberId,
  normalizeStoredWabaId,
  resolveChannelContextFromConversation,
  resolveWabaIdFromPhoneNumberId,
} from "@/lib/whatsapp/channelService";
import mongoose from "mongoose";
import { canAccessConversationAsync, CONVERSATION_ACCESS_SELECT } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";

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
 *   1. Live WhatsappChannel (by conversation channel id or phone)
 *   2. Meta API: phone_number_id → whatsapp_business_account (authoritative)
 *   3. Frozen conversation wabaId (only if channel/Meta have nothing)
 *   4. Env WHATSAPP_BUSINESS_ACCOUNT_ID fallback
 *
 * Note: stale wabaId on WhatsAppConversation (e.g. portfolio ID saved as WABA)
 * is ignored when channel or Meta can provide the real WABA.
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
        } | null;

      if (conv) {
        if (
          !(await canAccessConversationAsync(
            normalizeWhatsAppToken(token as WhatsAppToken),
            conv as Record<string, unknown>,
          ))
        ) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        resolution.phoneNumberId = conv.businessPhoneId?.trim() || resolution.phoneNumberId;

        const channel = await resolveChannelContextFromConversation({
          whatsappChannelId: conv.whatsappChannelId,
          businessPhoneId: conv.businessPhoneId,
        });

        if (channel?.accessToken?.trim()) {
          resolution.accessToken = channel.accessToken.trim();
        }

        // Prefer live channel WABA over frozen conversation snapshot.
        const channelWaba = normalizeStoredWabaId(
          channel?.wabaId,
          channel?.businessPortfolioId,
        );
        if (channelWaba) {
          resolution.wabaId = channelWaba;
          resolution.channelScoped = true;
          resolution.source = "channel";
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

      if (!resolution.accessToken) {
        resolution.accessToken = getWhatsAppToken();
      }

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

    if (!resolution.accessToken) {
      resolution.accessToken = getWhatsAppToken();
    }
    if (!resolution.wabaId) {
      resolution.wabaId = WHATSAPP_BUSINESS_ACCOUNT_ID || null;
      resolution.source = resolution.wabaId ? "env_fallback" : resolution.source;
    }

    if (!resolution.wabaId || !resolution.accessToken) {
      return NextResponse.json(
        { error: "WhatsApp configuration missing — no WABA or token resolved" },
        { status: 500 },
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

      // Last resort: env WABA (legacy single-portfolio).
      if (
        !fetchResult.ok &&
        isInvalidWabaGraphError(fetchResult.data) &&
        WHATSAPP_BUSINESS_ACCOUNT_ID &&
        WHATSAPP_BUSINESS_ACCOUNT_ID !== resolution.wabaId
      ) {
        console.warn("[whatsapp/templates] falling back to env WABA", {
          badWabaId: resolution.wabaId,
          envWabaId: WHATSAPP_BUSINESS_ACCOUNT_ID,
        });
        resolution.wabaId = WHATSAPP_BUSINESS_ACCOUNT_ID;
        resolution.source = "env_fallback_retry";
        resolution.channelScoped = false;
        fetchResult = await fetchTemplatesFromMeta(
          WHATSAPP_BUSINESS_ACCOUNT_ID,
          getWhatsAppToken(),
        );
      }
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
      return NextResponse.json(
        {
          error:
            (fetchResult.data as { error?: { message?: string } })?.error?.message ||
            "Failed to fetch templates",
          wabaId: resolution.wabaId,
          wabaSource: resolution.source,
        },
        { status: fetchResult.status },
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
