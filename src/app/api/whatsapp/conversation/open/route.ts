import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { canAccessConversation } from "@/lib/whatsapp/access";

export const dynamic = "force-dynamic";
connectDb();

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { phone } = await req.json();
    if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

    // Find conversation by participant phone (exact match preferred)
    const conv = await WhatsAppConversation.findOne({ participantPhone: phone }).lean();
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const allowed = await canAccessConversation(token, conv);
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ success: true, conversation: conv });
  } catch (error: any) {
    console.error("Open conversation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

