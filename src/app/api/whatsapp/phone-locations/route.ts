import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { canAccessPhoneId } from "@/lib/whatsapp/config";
import { getLocationsForPhone } from "@/lib/whatsapp/phoneAreaConfigService";
import {
  canAssignWhatsAppParticipantLocation,
  filterAssignableLocationsForUser,
} from "@/lib/whatsapp/participantLocationPrivileges";
import { getUserAreasFromToken } from "@/lib/whatsapp/areaTokenUtils";

export const dynamic = "force-dynamic";

connectDb();

/**
 * GET /api/whatsapp/phone-locations?phoneNumberId=...
 * Returns DB-backed cities assignable for a phone line (filtered by user role/area).
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (token as { role?: string }).role || "";
    const email = (token as { email?: string }).email;
    const userAreas = getUserAreasFromToken(
      token as { allotedArea?: string | string[] }
    );

    if (
      !canAssignWhatsAppParticipantLocation({
        role,
        email,
        allotedArea: userAreas,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const phoneNumberId = req.nextUrl.searchParams.get("phoneNumberId")?.trim();
    if (!phoneNumberId) {
      return NextResponse.json({ error: "phoneNumberId is required" }, { status: 400 });
    }

    if (!canAccessPhoneId(phoneNumberId, role, userAreas)) {
      return NextResponse.json(
        { error: "You don't have access to this WhatsApp line" },
        { status: 403 }
      );
    }

    const allOnPhone = await getLocationsForPhone(phoneNumberId);
    const locations = filterAssignableLocationsForUser(allOnPhone, {
      role,
      email,
      allotedArea: userAreas,
    });

    return NextResponse.json({ success: true, phoneNumberId, locations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
