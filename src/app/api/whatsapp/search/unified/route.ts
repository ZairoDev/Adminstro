/**
 * Unified WhatsApp Search API.
 *
 * GET /api/whatsapp/search/unified?query=&limit=
 *
 * Thin HTTP layer: validate -> authenticate/authorize -> conversationSearchService
 * -> phone masking. Search is global within the caller's permissions (the inbox
 * city dropdown / Admin Queue toggle do not narrow it).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { WHATSAPP_ACCESS_ROLES } from "@/lib/whatsapp/config";
import type { WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { toAuthErrorResponse } from "@/lib/whatsapp/authErrorResponse";
import {
  MAX_SEARCH_RESULTS,
  searchConversations,
} from "@/lib/whatsapp/conversationSearchService";
import {
  applyPhoneMaskToConversation,
  getDisplayPhone,
  resolveMaskRulesForToken,
  shouldMaskConversationPhone,
} from "@/lib/whatsapp/phoneMask";
import type { UnifiedSearchResults } from "@/lib/whatsapp/unifiedSearchUtils";

export const dynamic = "force-dynamic";

const searchParamsSchema = z.object({
  query: z.string().trim().min(1, "Query parameter is required").max(100),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_RESULTS).default(MAX_SEARCH_RESULTS),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const parsed = searchParamsSchema.safeParse({
      query: request.nextUrl.searchParams.get("query") ?? "",
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }
    const { query, limit } = parsed.data;

    const user = (await getDataFromToken(request)) as WhatsAppToken | null;
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userRole = user.role ?? "";
    if (!(WHATSAPP_ACCESS_ROLES as readonly string[]).includes(userRole)) {
      return NextResponse.json({ success: false, error: "No WhatsApp access" }, { status: 403 });
    }

    await connectDb();

    const outcome = await searchConversations({ user, query, limit });

    const phoneMaskRules = await resolveMaskRulesForToken(
      user as Parameters<typeof resolveMaskRulesForToken>[0],
    );
    const conversations = outcome.conversations.map((conv) => {
      const type =
        conv.conversationType === "owner" || conv.conversationType === "guest"
          ? conv.conversationType
          : undefined;
      const masked = applyPhoneMaskToConversation(conv, phoneMaskRules, userRole);
      if (
        masked.matches?.phoneMatchedText &&
        shouldMaskConversationPhone(type, phoneMaskRules, userRole)
      ) {
        masked.matches = {
          ...masked.matches,
          phoneMatchedText: getDisplayPhone(conv.participantPhone, type, phoneMaskRules, userRole),
        };
      }
      return masked;
    });

    const results: UnifiedSearchResults = {
      conversations,
      query,
      totalResults: conversations.length,
      searchTime: Date.now() - startTime,
      hasStartNewChat: Boolean(outcome.startNewChat),
      startNewChatPhone: outcome.startNewChat?.phone,
      startNewChat: outcome.startNewChat,
      messageSearchIncomplete: outcome.messageSearchIncomplete,
      scopeTruncated: outcome.scopeTruncated,
    };

    return NextResponse.json({ success: true, query, results });
  } catch (error: unknown) {
    const authResponse = toAuthErrorResponse(error);
    if (authResponse) return authResponse;

    console.error("[whatsapp/search/unified] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Search failed",
        searchTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
