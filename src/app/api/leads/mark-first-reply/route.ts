import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { emitWhatsAppEvent, WHATSAPP_EVENTS } from "@/lib/pusher";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, queryId } = body;

    if (!phone && !queryId) {
      return NextResponse.json({ success: false, error: "Provide phone or queryId" }, { status: 400 });
    }

    const QueryModel = (await import("@/models/query")).default;

    let lead: any = null;

    if (queryId) {
      lead = await QueryModel.findById(queryId);
    } else if (phone) {
      const normalized = String(phone).replace(/\D/g, "");
      // try direct match first then trailing match
      lead = await QueryModel.findOne({ phoneNo: { $regex: `${normalized}$` } });
      if (!lead) {
        // try last 9 digits
        const last9 = normalized.slice(-9);
        if (last9) lead = await QueryModel.findOne({ phoneNo: { $regex: `${last9}$` } });
      }
    }

    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    if (!lead.firstReply) {
      lead.firstReply = true;
      await lead.save();

      // Notify other clients in real-time
      try {
        emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATE, {
          queryId: lead._id?.toString(),
          phone: lead.phoneNo,
          firstReply: true,
        });
      } catch (e) {
        console.error("Failed to emit conversation update:", e);
      }
    }

    return NextResponse.json({ success: true, lead });
  } catch (err: any) {
    console.error("Error in mark-first-reply endpoint:", err);
    return NextResponse.json({ success: false, error: err.message || "Server error" }, { status: 500 });
  }
}
