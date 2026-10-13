import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";
import { listWebhookLogs } from "@/lib/whatsapp/webhookLog/monitorService";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  kind: z
    .enum([
      "status",
      "inbound_message",
      "message_echo",
      "call",
      "history",
      "app_state_sync",
      "other",
    ])
    .optional(),
  processingStatus: z
    .enum(["pending", "saved", "duplicate", "dropped", "error"])
    .optional(),
  signatureStatus: z
    .enum(["valid", "invalid", "missing_header", "unchecked"])
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{4,20}$/, "phone must contain 4-20 digits")
    .optional(),
  messageId: z.string().trim().min(1).max(200).optional(),
  businessPhoneId: z
    .string()
    .trim()
    .regex(/^\d{5,30}$/)
    .optional(),
});

function emptyToUndefined(value: string | null): string | undefined {
  return value && value.trim() ? value : undefined;
}

/** SuperAdmin: paginated raw Meta webhook log with per-message processing outcome. */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  const sp = new URL(req.url).searchParams;
  const parsed = querySchema.safeParse({
    days: emptyToUndefined(sp.get("days")),
    page: emptyToUndefined(sp.get("page")),
    limit: emptyToUndefined(sp.get("limit")),
    kind: emptyToUndefined(sp.get("kind")),
    processingStatus: emptyToUndefined(sp.get("processingStatus")),
    signatureStatus: emptyToUndefined(sp.get("signatureStatus")),
    phone: emptyToUndefined(sp.get("phone")),
    messageId: emptyToUndefined(sp.get("messageId")),
    businessPhoneId: emptyToUndefined(sp.get("businessPhoneId")),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await listWebhookLogs(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[webhook-monitor] logs failed:", error);
    return NextResponse.json(
      { error: "Failed to load webhook logs" },
      { status: 500 },
    );
  }
}
