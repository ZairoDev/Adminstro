import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";
import { getReadButNotReplied } from "@/lib/whatsapp/webhookLog/monitorService";
import { readNotRepliedToCsv } from "@/lib/whatsapp/webhookLog/readNotRepliedCsv";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  minAgeMinutes: z.coerce.number().int().min(0).max(30 * 24 * 60).default(60),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  verdict: z
    .enum([
      "webhook_received_not_stored",
      "replied_on_other_conversation",
      "no_inbound_webhook",
      "no_log_coverage",
    ])
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{4,20}$/, "phone must contain 4-20 digits")
    .optional(),
  format: z.enum(["json", "csv"]).default("json"),
});

function emptyToUndefined(value: string | null): string | undefined {
  return value && value.trim() ? value : undefined;
}

/**
 * SuperAdmin: customers who READ our last message but have no reply stored,
 * with a verdict from cross-checking the raw webhook log. `format=csv` exports
 * the whole filtered list (call list for agents).
 */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    days: emptyToUndefined(sp.get("days")),
    minAgeMinutes: emptyToUndefined(sp.get("minAgeMinutes")),
    page: emptyToUndefined(sp.get("page")),
    limit: emptyToUndefined(sp.get("limit")),
    verdict: emptyToUndefined(sp.get("verdict")),
    phone: emptyToUndefined(sp.get("phone")),
    format: emptyToUndefined(sp.get("format")),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { format, ...params } = parsed.data;

  try {
    if (format === "csv") {
      const result = await getReadButNotReplied({
        ...params,
        page: 1,
        limit: 5000,
      });
      return new NextResponse(readNotRepliedToCsv(result.rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="read-not-replied-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(await getReadButNotReplied(params));
  } catch (error) {
    console.error("[webhook-monitor] read-not-replied failed:", error);
    return NextResponse.json(
      { error: "Failed to compute read-not-replied list" },
      { status: 500 },
    );
  }
}
