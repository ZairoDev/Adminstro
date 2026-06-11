import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";

import mongoose from "mongoose";
import { Properties } from "@/models/property";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";
import Users from "@/models/user";
import { getDataFromToken } from "@/util/getDataFromToken";
import { computeShortTermOwnerReadiness } from "@/lib/short-term-owner-readiness";

connectDb();

export async function POST(req: NextRequest) {
  try {
    let auth: { role?: string; email?: string };
    try {
      auth = (await getDataFromToken(req)) as { role?: string; email?: string };
    } catch (err: unknown) {
      const authErr = err as { status?: number; code?: string };
      const status = authErr?.status ?? 401;
      const code = authErr?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const { id, isLive, forceLive }: { id: string; isLive: boolean; forceLive?: boolean } =
      await req.json();

    const role = String(auth.role ?? "").trim();
    if (role !== "SuperAdmin" && role !== "Advert") {
      return NextResponse.json(
        {
          message:
            "Only SuperAdmin or Advert can change property visibility. Ask SuperAdmin to approve or hide the property.",
        },
        { status: 403 },
      );
    }

    if (!id || typeof isLive !== "boolean") {
      return NextResponse.json(
        { message: "Invalid data provided." },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid property ID." },
        { status: 400 }
      );
    }

    const property = await Properties.findById(id);

    if (!property) {
      return NextResponse.json(
        { message: "Property not found." },
        { status: 404 }
      );
    }

    if (
      isLive &&
      property.listingSource === "short_term_owner_sheet" &&
      role !== "SuperAdmin" &&
      !forceLive
    ) {
      const sheetRow = property.sourceOwnerSheetId
        ? await unregisteredOwnerShortTerm.findById(property.sourceOwnerSheetId).lean()
        : null;
      const user = property.userId
        ? await Users.findById(property.userId)
            .select(
              "name email phone address nationality bankDetails isProfileComplete ownerProfileCompletedAt",
            )
            .lean()
        : null;

      const readiness = computeShortTermOwnerReadiness({
        sheetRow: (sheetRow ?? {
          ownerUserId: property.userId,
          propertyMongoId: String(property._id),
          advertListingStatus: "listed_draft",
          VSID: property.VSID,
        }) as Parameters<typeof computeShortTermOwnerReadiness>[0]["sheetRow"],
        user: user as Parameters<typeof computeShortTermOwnerReadiness>[0]["user"],
        property: property.toObject() as Parameters<
          typeof computeShortTermOwnerReadiness
        >[0]["property"],
      });

      if (!readiness.readyToGoLive) {
        return NextResponse.json(
          {
            message: "Owner must complete onboarding before going live.",
            missingSteps: readiness.missingSteps,
          },
          { status: 403 },
        );
      }
    }

    property.isLive = isLive;
    if (isLive && property.listingSource === "short_term_owner_sheet") {
      property.ownerOnboardingComplete = true;
    }

    await property.save();

    if (
      isLive &&
      property.sourceOwnerSheetId &&
      property.listingSource === "short_term_owner_sheet"
    ) {
      await unregisteredOwnerShortTerm.findByIdAndUpdate(
        property.sourceOwnerSheetId,
        { advertListingStatus: "live" },
      );
    }

    return NextResponse.json({
      message: `Property has been successfully ${
        isLive ? "made live" : "hidden"
      }.`,
      property,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}
