import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { isWhatsAppAccessRole } from "@/lib/whatsapp/config";
import { findLeadByPhoneOrEmail } from "@/lib/whatsapp/leadLookupService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req) as { role?: string };
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isWhatsAppAccessRole(token.role || "") && token.role !== "Advert") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const phone = req.nextUrl.searchParams.get("phone")?.trim();
    const email = req.nextUrl.searchParams.get("email")?.trim();

    if (!phone && !email) {
      return NextResponse.json(
        { error: "phone or email is required" },
        { status: 400 },
      );
    }

    const lead = await findLeadByPhoneOrEmail({ phone, email });
    return NextResponse.json({ success: true, lead });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
