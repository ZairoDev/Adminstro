import { NextRequest, NextResponse } from "next/server";
import {
  getWebhookInspectorFilter,
  setWebhookInspectorRuntimeFilter,
} from "@/lib/whatsapp/webhookInspector";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";

export const dynamic = "force-dynamic";

/** GET current inspector filter. POST to set runtime overrides (no restart). */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ filter: getWebhookInspectorFilter() });
}

export async function POST(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    enabled?: boolean;
    customerPhone?: string | null;
    messageId?: string | null;
    businessPhoneId?: string | null;
    conversationId?: string | null;
    clear?: boolean;
  };

  if (body.clear) {
    return NextResponse.json({
      filter: setWebhookInspectorRuntimeFilter(null),
    });
  }

  const patch: Record<string, string | boolean | undefined> = {};
  if (body.enabled !== undefined) patch.enabled = body.enabled;
  if (body.customerPhone !== undefined) {
    patch.customerPhone = body.customerPhone ?? undefined;
  }
  if (body.messageId !== undefined) patch.messageId = body.messageId ?? undefined;
  if (body.businessPhoneId !== undefined) {
    patch.businessPhoneId = body.businessPhoneId ?? undefined;
  }
  if (body.conversationId !== undefined) {
    patch.conversationId = body.conversationId ?? undefined;
  }

  return NextResponse.json({
    filter: setWebhookInspectorRuntimeFilter(patch),
  });
}
