import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";
import { getWebhookMonitorSummary } from "@/lib/whatsapp/webhookLog/monitorService";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});

/** SuperAdmin: webhook health — counts, last-received times, drop reasons. */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  const parsed = querySchema.safeParse({
    days: new URL(req.url).searchParams.get("days") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await getWebhookMonitorSummary(parsed.data.days));
  } catch (error) {
    console.error("[webhook-monitor] summary failed:", error);
    return NextResponse.json(
      { error: "Failed to load webhook summary" },
      { status: 500 },
    );
  }
}
