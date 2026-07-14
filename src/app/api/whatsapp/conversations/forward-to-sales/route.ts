import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import {
  canAccessConversationAsync,
  CONVERSATION_ACCESS_SELECT,
} from "@/lib/whatsapp/access";
import { normalizeWhatsAppToken } from "@/lib/whatsapp/apiContext";
import { canForwardLeadToSales } from "@/lib/whatsapp/leadGenHandoff";
import { buildWhatsAppRoomPayload } from "@/lib/whatsapp/socketPayload";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z
    .string()
    .min(1)
    .refine((id) => mongoose.Types.ObjectId.isValid(id), {
      message: "Invalid conversationId",
    }),
});

/**
 * LeadGen forwards a guest conversation to Sales.
 * Sets handedToSales=true — LeadGen loses visibility; Sales gains it.
 * Reuses existing CONVERSATION_UPDATE + type "transfer" socket path (no new client protocol).
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as Record<string, unknown> | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalized = normalizeWhatsAppToken(token);
    const userRole = normalized.role || "";

    if (!canForwardLeadToSales(userRole)) {
      return NextResponse.json(
        { error: "Only LeadGen can forward leads to Sales" },
        { status: 403 },
      );
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 },
      );
    }

    await connectDb();

    const conversation = await WhatsAppConversation.findById(
      parsed.data.conversationId,
    ).select(`${CONVERSATION_ACCESS_SELECT} handedToSalesAt handedToSalesBy`);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const convLean = conversation.toObject
      ? conversation.toObject()
      : (conversation as unknown as Record<string, unknown>);

    if (!(await canAccessConversationAsync(normalized, convLean))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (conversation.handedToSales !== false) {
      return NextResponse.json(
        { error: "Conversation is already with the Sales team" },
        { status: 400 },
      );
    }

    const agentId = normalized.id
      ? new mongoose.Types.ObjectId(normalized.id)
      : null;

    const updated = (await WhatsAppConversation.findOneAndUpdate(
      { _id: conversation._id, handedToSales: false },
      {
        $set: {
          handedToSales: true,
          handedToSalesAt: new Date(),
          ...(agentId ? { handedToSalesBy: agentId } : {}),
        },
      },
      { new: true },
    ).lean()) as {
      _id: mongoose.Types.ObjectId;
      businessPhoneId?: string;
      whatsappChannelId?: mongoose.Types.ObjectId;
      [key: string]: unknown;
    } | null;

    if (!updated) {
      return NextResponse.json(
        { error: "Conversation is already with the Sales team" },
        { status: 409 },
      );
    }

    // Reuse existing "transfer" update type → Sales inbox refetches; LeadGen drops the row.
    emitWhatsAppEvent(
      WHATSAPP_EVENTS.CONVERSATION_UPDATE,
      buildWhatsAppRoomPayload(updated, {
        type: "transfer",
        conversationId: String(updated._id),
        handedToSales: true,
        businessPhoneId: updated.businessPhoneId,
      }),
    );

    return NextResponse.json({
      success: true,
      conversation: updated,
      message: "Lead forwarded to Sales team",
    });
  } catch (error: unknown) {
    console.error("[forward-to-sales]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to forward lead",
      },
      { status: 500 },
    );
  }
}
