// import UnregisteredOwnersTable from "@/app/dashboard/unregistered-owner/unregisteredTable";
import { normalizeOwnerPhoneInput } from "@/app/spreadsheet/utils/ownerPhoneNormalize";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import {
  hasGeocodableFields,
  scheduleLocationGeoSync,
} from "@/services/unregistered-owner-geocode";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

function normalizePropertyFloorInput(raw: unknown): string {
  const s = String(raw ?? "").trim();
  const ok = s === "" || s === "Mezzanine" || /^([1-9]|10)$/.test(s);
  return ok ? s : "";
}

export async function POST(req: NextRequest) {
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

    const ownerFields = {
      address: body.address as string | undefined,
      location: body.location as string | undefined,
      area: body.area as string | undefined,
    };

    const data = await unregisteredOwner.create({
      name: body.name,
      phoneNumber: normalizeOwnerPhoneInput(String(body.phoneNumber ?? "")),
      location: body.location,
      price: body.price,
      interiorStatus: body.interiorStatus,
      propertyType: body.propertyType,
      link: body.link,
      area: body.area,
      referenceLink: body.referenceLink,
      address: body.address,
      remarks: body.remarks,
      geoAddressVerified:
        body.geoAddressVerified === "Verified" ? "Verified" : "None",
      propertyFloor: normalizePropertyFloorInput(body.propertyFloor),
    });

    if (hasGeocodableFields(ownerFields)) {
      scheduleLocationGeoSync(data._id, ownerFields);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
