import { isValidOwnerPropertyFloor } from "@/app/spreadsheet/constants/ownerSheetFields";
import { normalizeOwnerPhoneInput } from "@/app/spreadsheet/utils/ownerPhoneNormalize";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { Properties } from "@/models/property";
import { scheduleLocationGeoSync } from "@/services/unregistered-owner-geocode";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

const GEO_TRIGGER_FIELDS = new Set(["address", "location", "area"]);

export async function PUT(
  req: NextRequest,
  { params }: { params: { _id: string } },
) {
  try {
    try {
      await getDataFromToken(req);
    } catch (err: unknown) {
      const authErr = err as { status?: number; code?: string };
      const status = authErr?.status ?? 401;
      const code = authErr?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const body = await req.json();
    const { field, value, unavailableUntil } = body as {
      field: string;
      value: unknown;
      unavailableUntil?: string;
    };

    const data = await unregisteredOwner.findById(params._id);
    if (!data) {
      return NextResponse.json({ message: "Data not found" }, { status: 404 });
    }

    if (field === "phoneNumber") {
      data.phoneNumber = normalizeOwnerPhoneInput(String(value ?? ""));
    } else if (field === "imageUrls" && Array.isArray(value)) {
      data.imageUrls = [...data.imageUrls, ...value];
    } else if (field === "geoAddressVerified") {
      data.geoAddressVerified = value === "Verified" ? "Verified" : "None";
    } else if (field === "propertyFloor") {
      const s = String(value ?? "").trim();
      data.propertyFloor = isValidOwnerPropertyFloor(s)
        ? s
        : (data.propertyFloor ?? "");
    } else {
      (data as Record<string, unknown>)[field] = value;
    }

    if (field === "availability") {
      if (value === "Not Available") {
        if (!unavailableUntil) {
          return NextResponse.json(
            { message: "unavailableUntil is required for Not Available" },
            { status: 400 },
          );
        }
        const parsedDate = new Date(unavailableUntil);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json(
            { message: "Invalid unavailableUntil date" },
            { status: 400 },
          );
        }
        parsedDate.setHours(23, 59, 59, 999);
        data.unavailableUntil = parsedDate;
      } else if (value === "Available") {
        data.unavailableUntil = null;
      }
    }

    await data.save();

    if (GEO_TRIGGER_FIELDS.has(field)) {
      scheduleLocationGeoSync(data._id, {
        address: data.address,
        location: data.location,
        area: data.area,
      });
    }

    if (field === "availability" && data.VSID && data.VSID.trim() !== "") {
      await Properties.updateOne(
        { VSID: data.VSID },
        { $set: { availability: value } },
      );
    }

    return NextResponse.json(
      { message: "Data updated successfully" },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { _id: string } },
) {
  const { _id } = params;
  try {
    await unregisteredOwner.findByIdAndDelete(_id);
    return NextResponse.json(
      { message: "Data deleted successfully" },
      { status: 200 },
    );
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
