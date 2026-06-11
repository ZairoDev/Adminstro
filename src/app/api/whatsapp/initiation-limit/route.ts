import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { normalizeWhatsAppToken, type WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { getInitiationLimitStatus } from "@/lib/whatsapp/initiationLimitService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as WhatsAppToken | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalized = normalizeWhatsAppToken(token);
    const conversationType = req.nextUrl.searchParams.get("conversationType");
    const type =
      conversationType === "owner" || conversationType === "guest"
        ? conversationType
        : undefined;

    const status = await getInitiationLimitStatus(
      normalized.id,
      normalized.role || "",
      type,
    );

    return NextResponse.json({ success: true, ...status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
