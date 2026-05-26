import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getAssignableLocationOptionsForUser } from "@/lib/whatsapp/assignableLocations";
import { canAssignWhatsAppParticipantLocation } from "@/lib/whatsapp/participantLocationPrivileges";

export const dynamic = "force-dynamic";

connectDb();

/**
 * GET /api/whatsapp/configured-locations
 * All cities on any WhatsApp line (union), filtered by user allotedArea when applicable.
 * Use for Set/Change location — not limited to the conversation's phone line.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (token as { role?: string }).role || "";
    const email = (token as { email?: string }).email;
    const allotedArea = (token as { allotedArea?: string | string[] }).allotedArea;

    if (
      !canAssignWhatsAppParticipantLocation({
        role,
        email,
        allotedArea,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const locations = await getAssignableLocationOptionsForUser({
      role,
      email,
      allotedArea,
    });

    return NextResponse.json({
      success: true,
      locations,
      /** @deprecated use locations[].displayName */
      locationDisplays: locations.map((l) => l.displayName),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
