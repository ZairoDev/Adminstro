import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getWebhookLogStats } from "@/lib/whatsapp/webhookLog/persist";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  phone: z.string().optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
});

/** Webhook counts — all webhooks or filtered by customer phone. */
export async function GET(req: NextRequest) {
  const token = (await getDataFromToken(req)) as { id?: string } | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    phone: searchParams.get("phone") ?? undefined,
    days: searchParams.get("days") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const stats = await getWebhookLogStats({
    phone: parsed.data.phone,
    days: parsed.data.days ?? 7,
  });

  return NextResponse.json(stats);
}
