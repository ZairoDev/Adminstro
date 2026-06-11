import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversationAsync, CONVERSATION_ACCESS_SELECT } from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { SUPPORTED_TRANSLATION_LANGUAGES } from "@/lib/whatsapp/translation/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  preferredLanguage: z.string().max(80).nullable().optional(),
  preferredLanguageCode: z.string().max(10).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    await connectDb();
    const token = (await getDataFromToken(_req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conv = (await WhatsAppConversation.findById(params.conversationId)
      .select(
        `${CONVERSATION_ACCESS_SELECT} preferredLanguage preferredLanguageCode preferredLanguageUpdatedAt`,
      )
      .lean()) as {
      preferredLanguage?: string;
      preferredLanguageCode?: string;
      preferredLanguageUpdatedAt?: Date;
    } | null;

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allowed = await canAccessConversationAsync(
      normalizeWhatsAppToken(token),
      conv as Record<string, unknown>,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      preferredLanguage: conv.preferredLanguage || "",
      preferredLanguageCode: conv.preferredLanguageCode || "",
      preferredLanguageUpdatedAt: conv.preferredLanguageUpdatedAt || null,
      supportedLanguages: SUPPORTED_TRANSLATION_LANGUAGES,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    await connectDb();
    const token = (await getDataFromToken(req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conv = await WhatsAppConversation.findById(params.conversationId).lean();
    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allowed = await canAccessConversationAsync(
      normalizeWhatsAppToken(token),
      conv as Record<string, unknown>,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      preferredLanguageUpdatedAt: new Date(),
    };

    if (parsed.data.preferredLanguageCode === null) {
      update.preferredLanguage = "";
      update.preferredLanguageCode = "";
    } else {
      if (parsed.data.preferredLanguage !== undefined) {
        update.preferredLanguage = parsed.data.preferredLanguage ?? "";
      }
      if (parsed.data.preferredLanguageCode !== undefined) {
        update.preferredLanguageCode = parsed.data.preferredLanguageCode ?? "";
      }
    }

    const updated = await WhatsAppConversation.findByIdAndUpdate(
      params.conversationId,
      { $set: update },
      { new: true },
    )
      .select("preferredLanguage preferredLanguageCode preferredLanguageUpdatedAt")
      .lean();

    return NextResponse.json({ success: true, ...updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
