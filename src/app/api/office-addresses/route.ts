import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import OfficeAddress, { formatOfficeAddress } from "@/models/officeAddress";
import { requireOfficeAddressManager } from "@/lib/officeAddress/auth";
import { seedDefaultOffices } from "@/lib/officeAddress/seedDefaultOffices";
import { backfillCandidateOfficeAddresses } from "@/lib/officeAddress/backfillCandidateOfficeAddresses";

export const dynamic = "force-dynamic";

/**
 * GET /api/office-addresses
 * - ?active=1 → public list of active offices (application form)
 * - otherwise → authenticated HR list (all offices)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const activeOnly = request.nextUrl.searchParams.get("active") === "1";

    if (!activeOnly) {
      const auth = await requireOfficeAddressManager(request);
      if (!auth.ok) return auth.response;
      // Opportunistic backfill for legacy candidates with officeLocation only
      await backfillCandidateOfficeAddresses().catch((err) =>
        console.warn("[office-addresses] backfill skipped:", err),
      );
    }

    // Seed defaults when collection is empty so the form always has options
    const count = await OfficeAddress.countDocuments();
    if (count === 0) {
      await seedDefaultOffices();
    }

    const query = activeOnly ? { isActive: true } : {};
    const offices = await OfficeAddress.find(query).sort({ name: 1 }).lean();

    return NextResponse.json({ success: true, data: offices });
  } catch (error) {
    console.error("[office-addresses] GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch office addresses" },
      { status: 500 },
    );
  }
}

/** POST /api/office-addresses — create (HR/SuperAdmin/Admin) */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireOfficeAddressManager(request);
    if (!auth.ok) return auth.response;

    await connectDb();
    const body = await request.json();

    const name = String(body.name || "").trim();
    const addressLine1 = String(body.addressLine1 || "").trim();
    const addressLine2 = String(body.addressLine2 || "").trim() || null;
    const city = String(body.city || "").trim();
    const state = String(body.state || "").trim();
    const pincode = String(body.pincode || "").trim();
    const country = String(body.country || "India").trim() || "India";
    const isActive = body.isActive !== false;

    if (!name || !addressLine1 || !city || !state || !pincode) {
      return NextResponse.json(
        {
          success: false,
          error: "name, addressLine1, city, state, and pincode are required",
        },
        { status: 400 },
      );
    }

    const existing = await OfficeAddress.findOne({ name });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An office with this name already exists" },
        { status: 400 },
      );
    }

    const office = await OfficeAddress.create({
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      pincode,
      country,
      isActive,
      formattedAddress: formatOfficeAddress({
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        country,
      }),
    });

    return NextResponse.json({ success: true, data: office }, { status: 201 });
  } catch (error) {
    console.error("[office-addresses] POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create office address" },
      { status: 500 },
    );
  }
}
