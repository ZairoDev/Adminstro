// import UnregisteredOwnersTable from "@/app/dashboard/unregistered-owner/unregisteredTable";
import { isValidOwnerPropertyFloor } from "@/app/spreadsheet/constants/ownerSheetFields";
import { normalizeOwnerPhoneInput } from "@/app/spreadsheet/utils/ownerPhoneNormalize";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import {
  hasGeocodableFields,
  scheduleLocationGeoSync,
} from "@/services/unregistered-owner-geocode";
import { isLocationExempt } from "@/util/apiSecurity";
import { getDataFromToken } from "@/util/getDataFromToken";
import { resolveDefaultOwnerRowLocation } from "@/util/ownerSheetLocationFilter";
import { NextRequest, NextResponse } from "next/server";

function normalizePropertyFloorInput(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return isValidOwnerPropertyFloor(s) ? s : "";
}

export async function POST(req: NextRequest) {
  try {
    let token: { role?: string; allotedArea?: unknown };
    try {
      token = (await getDataFromToken(req)) as {
        role?: string;
        allotedArea?: unknown;
      };
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
    const role = token.role ?? "";

    const requestedLocation = String(body.location ?? "").trim();
    const hasExplicitLocation =
      requestedLocation.length > 0 &&
      requestedLocation.toLowerCase() !== "unknown";

    let location = resolveDefaultOwnerRowLocation({
      role,
      tokenAllotedArea: token.allotedArea,
      filterPlace: hasExplicitLocation ? [requestedLocation] : [],
    });

    // Restricted user explicitly requested a city outside their allocation:
    // resolveDefaultOwnerRowLocation already snapped it back to an allowed city.
    // For exempt roles, honor the explicit value as-is.
    if (hasExplicitLocation && isLocationExempt(role)) {
      location = requestedLocation;
    }

    if (!location) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No allotted location on your account. Ask an admin to assign cities before adding rows.",
        },
        { status: 400 },
      );
    }

    const ownerFields = {
      address: body.address as string | undefined,
      location,
      area: body.area as string | undefined,
    };

    const data = await unregisteredOwner.create({
      name: body.name,
      phoneNumber: normalizeOwnerPhoneInput(String(body.phoneNumber ?? "")),
      location,
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
