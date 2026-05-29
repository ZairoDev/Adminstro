import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getPhoneConfigById } from "@/lib/whatsapp/config";
import { isWhatsAppRole } from "@/lib/whatsapp/apiContext";
import { resolvePhoneIdForLocation } from "@/lib/whatsapp/phoneAreaConfigService";

export const dynamic = "force-dynamic";

connectDb();

/**
 * GET /api/whatsapp/resolve-phone-for-location?location=Athens
 * Returns the WhatsApp business phoneNumberId for a city (DB first, then config fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (token as { role?: string }).role || "";
    if (!isWhatsAppRole(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const location = req.nextUrl.searchParams.get("location")?.trim();
    if (!location) {
      return NextResponse.json({ error: "location is required" }, { status: 400 });
    }

    const phoneNumberId = await resolvePhoneIdForLocation(location);
    if (!phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error: "No WhatsApp line configured for this location",
          hint: "SuperAdmin must assign this city to a phone line under Phone locations.",
        },
        { status: 404 }
      );
    }

    const config = getPhoneConfigById(phoneNumberId);

    return NextResponse.json({
      success: true,
      location,
      phoneNumberId,
      displayName: config?.displayName ?? "",
      displayNumber: config?.displayNumber ?? "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
