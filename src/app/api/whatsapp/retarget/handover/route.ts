import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import Employee from "@/models/employee";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { conversationId, area, selectedSalesAgentId } = body;
    if (!conversationId || !area) {
      return NextResponse.json({ error: "conversationId and area are required" }, { status: 400 });
    }

    // Only Advert can handover
    if ((token.role || "") !== "Advert") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conv = await WhatsAppConversation.findById(conversationId);
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    if (!conv.isRetarget) {
      return NextResponse.json({ error: "Conversation is not a retarget conversation" }, { status: 400 });
    }

    // Determine Sales agent
    let assignedSalesId: mongoose.Types.ObjectId | null = null;

    if (selectedSalesAgentId) {
      const selected = (await Employee.findById(selectedSalesAgentId).lean()) as any;
      if (!selected || selected.role !== "Sales") {
        return NextResponse.json({ error: "Selected agent is not valid Sales agent" }, { status: 400 });
      }
      assignedSalesId = selected._id as any;
    } else {
      // Auto-select by area: find active Sales with allottedArea containing the area
      const candidates = await Employee.find({
        role: "Sales",
        $and: [
          { $or: [{ isActive: { $exists: false } }, { isActive: true }] },
          {
            $or: [
              { allotedArea: area },
              { allotedArea: { $in: [area] } },
              { allotedArea: { $elemMatch: { $eq: area } } },
            ],
          },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(1)
        .lean() as any;

      if (candidates && candidates.length > 0) {
        assignedSalesId = candidates[0]._id as any;
      } else {
        // Fallback: pick any active Sales
        const anySales = (await Employee.findOne({ role: "Sales", $or: [{ isActive: { $exists: false } }, { isActive: true }] }).lean()) as any;
        if (anySales) assignedSalesId = anySales._id as any;
      }
    }

    if (!assignedSalesId) {
      return NextResponse.json({ error: "No Sales agent available for assignment" }, { status: 400 });
    }

    // Update conversation
    conv.retargetStage = "handed_to_sales";
    conv.ownerRole = "Sales";
    conv.ownerUserId = assignedSalesId;
    conv.handoverCompletedAt = new Date();
    conv.assignedAgent = assignedSalesId;
    await conv.save();

    // Emit socket event
    emitWhatsAppEvent("retarget_handover", {
      type: "retarget_handover",
      conversationId: conv._id.toString(),
      assignedSalesId: assignedSalesId.toString(),
      handoverCompletedAt: conv.handoverCompletedAt,
    });

    return NextResponse.json({ success: true, assignedSalesId: assignedSalesId.toString() });
  } catch (error: any) {
    console.error("Handover error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}

