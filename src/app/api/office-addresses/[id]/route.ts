import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import OfficeAddress, { formatOfficeAddress } from "@/models/officeAddress";
import { requireOfficeAddressManager } from "@/lib/officeAddress/auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireOfficeAddressManager(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid office address id" },
        { status: 400 },
      );
    }

    await connectDb();
    const office = await OfficeAddress.findById(id).lean();
    if (!office) {
      return NextResponse.json(
        { success: false, error: "Office address not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: office });
  } catch (error) {
    console.error("[office-addresses] GET [id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch office address" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireOfficeAddressManager(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid office address id" },
        { status: 400 },
      );
    }

    await connectDb();
    const body = await request.json();
    const office = await OfficeAddress.findById(id);
    if (!office) {
      return NextResponse.json(
        { success: false, error: "Office address not found" },
        { status: 404 },
      );
    }

    if (body.name !== undefined) office.name = String(body.name).trim();
    if (body.addressLine1 !== undefined)
      office.addressLine1 = String(body.addressLine1).trim();
    if (body.addressLine2 !== undefined)
      office.addressLine2 = String(body.addressLine2 || "").trim() || null;
    if (body.city !== undefined) office.city = String(body.city).trim();
    if (body.state !== undefined) office.state = String(body.state).trim();
    if (body.pincode !== undefined) office.pincode = String(body.pincode).trim();
    if (body.country !== undefined)
      office.country = String(body.country || "India").trim() || "India";
    if (body.isActive !== undefined) office.isActive = Boolean(body.isActive);

    if (!office.name || !office.addressLine1 || !office.city || !office.state || !office.pincode) {
      return NextResponse.json(
        {
          success: false,
          error: "name, addressLine1, city, state, and pincode are required",
        },
        { status: 400 },
      );
    }

    // Unique name check
    const clash = await OfficeAddress.findOne({
      name: office.name,
      _id: { $ne: office._id },
    });
    if (clash) {
      return NextResponse.json(
        { success: false, error: "An office with this name already exists" },
        { status: 400 },
      );
    }

    office.formattedAddress = formatOfficeAddress({
      addressLine1: office.addressLine1,
      addressLine2: office.addressLine2,
      city: office.city,
      state: office.state,
      pincode: office.pincode,
      country: office.country,
    });

    await office.save();
    return NextResponse.json({ success: true, data: office });
  } catch (error) {
    console.error("[office-addresses] PATCH failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update office address" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireOfficeAddressManager(request);
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid office address id" },
        { status: 400 },
      );
    }

    await connectDb();
    const deleted = await OfficeAddress.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Office address not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Office address deleted" });
  } catch (error) {
    console.error("[office-addresses] DELETE failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete office address" },
      { status: 500 },
    );
  }
}
