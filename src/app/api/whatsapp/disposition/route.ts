import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { applyWhatsAppDisposition } from "@/lib/whatsapp/whatsappDispositionService";
import type { WhatsAppDispositionAction } from "@/lib/whatsapp/crmLabels";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  action: z.string().min(1),
  reason: z.string().max(2000).optional(),
  customLabel: z.string().max(100).optional(),
  leadId: z.string().optional(),
  reminderAt: z.string().optional(),
  leadQualityByReviewer: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const token = (await getDataFromToken(req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await applyWhatsAppDisposition({
      token: normalizeWhatsAppToken(token),
      conversationId: parsed.data.conversationId,
      action: parsed.data.action as WhatsAppDispositionAction,
      reason: parsed.data.reason,
      customLabel: parsed.data.customLabel,
      leadId: parsed.data.leadId,
      reminderAt: parsed.data.reminderAt,
      leadQualityByReviewer: parsed.data.leadQualityByReviewer,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    return NextResponse.json(
      { error: err.message || "Failed to apply disposition" },
      { status: err.status || 500 },
    );
  }
}
