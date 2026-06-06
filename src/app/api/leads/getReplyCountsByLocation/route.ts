import { NextRequest, NextResponse } from "next/server";
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
<<<<<<< Updated upstream
import { aggregateWhatsAppReplyCountsByLocation } from "@/lib/whatsapp/replyCountsByLocation";
=======
import { applyEmployeeRentalTypeLeadFilter } from "@/lib/enforceEmployeeRentalType";
import { aggregateReplyCountsByLocation } from "@/lib/whatsapp/replyStatusResolver";
>>>>>>> Stashed changes

connectDb();

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const role = token?.role as string | undefined;
    const assignedArea = token?.allotedArea;

    const { searchParams } = new URL(req.url);
    const days = searchParams.get("days");
    const createdBy = searchParams.get("createdBy");

    const monthlyTargets = await MonthlyTarget.find({}).select("city").lean();
    const validLocations: string[] = monthlyTargets
      .map((t) => (t as { city?: string }).city)
      .filter((city): city is string => Boolean(city) && typeof city === "string")
      .map((city: string) => city.toLowerCase());

    if (validLocations.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

<<<<<<< Updated upstream
    const finalResult = await aggregateWhatsAppReplyCountsByLocation(
=======
    const query = await applyEmployeeRentalTypeLeadFilter(
      buildLeadQuery(
        validLocations,
        days,
        createdBy,
        role,
        assignedArea,
      ),
      token,
    );

    const leads = await Query.find(query)
      .select("phoneNo location")
      .lean();

    const finalResult = await aggregateReplyCountsByLocation(
      leads as Array<{ phoneNo?: string | number; location?: string }>,
>>>>>>> Stashed changes
      validLocations,
      {
        days,
        createdBy,
        role,
        assignedArea,
      },
    );

    return NextResponse.json({
      success: true,
      data: finalResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching reply counts by location:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching reply counts by location",
        error: message,
      },
      { status: 500 },
    );
  }
}
