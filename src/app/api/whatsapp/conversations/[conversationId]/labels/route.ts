import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/modules/whatsapp/models/conversation.model";
import { canAccessConversationAsync, CONVERSATION_ACCESS_SELECT } from "@/modules/whatsapp/services/access";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/modules/whatsapp/services/api-context";
import {
  addLabelsToConversation,
  removeLabelFromConversation,
  setConversationLabels,
  syncPrimaryDispositionLabels,
} from "@/modules/whatsapp/services/conversation-label.service";
import { WHATSAPP_EVENTS } from "@/lib/pusher";
import { emitWhatsAppEventToEligibleUsers } from "@/modules/whatsapp/services/emit-to-eligible-users";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.string().optional(),
  set: z.array(z.string()).optional(),
  syncFromLeadStatus: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  try {
    await connectDb();
    const token = (await getDataFromToken(req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conv = (await WhatsAppConversation.findById(params.conversationId)
      .select(`${CONVERSATION_ACCESS_SELECT} labels`)
      .lean()) as { labels?: string[] } | null;
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

    return NextResponse.json({ success: true, labels: conv.labels ?? [] });
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

    const normalized = normalizeWhatsAppToken(token);
    const allowed = await canAccessConversationAsync(
      normalized,
      conv as Record<string, unknown>,
    );
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    let labels: string[];
    if (parsed.data.syncFromLeadStatus !== undefined) {
      labels = await syncPrimaryDispositionLabels(
        params.conversationId,
        parsed.data.syncFromLeadStatus,
      );
    } else if (parsed.data.set) {
      labels = await setConversationLabels(params.conversationId, parsed.data.set);
    } else {
      if (parsed.data.add?.length) {
        labels = await addLabelsToConversation(params.conversationId, parsed.data.add);
      } else {
        labels =
          ((await WhatsAppConversation.findById(params.conversationId)
            .select("labels")
            .lean()) as { labels?: string[] } | null)?.labels ?? [];
      }
      if (parsed.data.remove) {
        labels = await removeLabelFromConversation(params.conversationId, parsed.data.remove);
      }
    }

    try {
      const convForEmit = await WhatsAppConversation.findById(params.conversationId).lean();
      if (convForEmit) {
        await emitWhatsAppEventToEligibleUsers(
          WHATSAPP_EVENTS.CONVERSATION_UPDATE,
          convForEmit as Record<string, unknown>,
          {
            type: "label",
            conversationId: params.conversationId,
            labels,
            businessPhoneId: (convForEmit as { businessPhoneId?: string }).businessPhoneId,
          },
        );
      }
    } catch {
      // non-critical
    }

    return NextResponse.json({ success: true, labels });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
