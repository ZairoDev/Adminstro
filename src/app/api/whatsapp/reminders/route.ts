import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import {
  createWhatsAppReminder,
  getEmployeeWhatsAppReminders,
} from "@/lib/whatsapp/whatsappReminderService";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  conversationId: z.string().min(1),
  scheduledAt: z.string().min(1),
  note: z.string().min(1).max(2000),
  leadQueryId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = (await getDataFromToken(req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalized = normalizeWhatsAppToken(token);
    const includePast = req.nextUrl.searchParams.get("includePast") === "true";
    const reminders = await getEmployeeWhatsAppReminders(normalized.id, {
      includePast,
    });

    return NextResponse.json({ success: true, reminders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const token = (await getDataFromToken(req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = postSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const result = await createWhatsAppReminder({
      token: normalizeWhatsAppToken(token),
      ...parsed.data,
    });

    return NextResponse.json({
      success: true,
      reminder: result.reminder,
      labels: result.labels,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    return NextResponse.json(
      { error: err.message || "Failed to create reminder" },
      { status: err.status || 500 },
    );
  }
}
