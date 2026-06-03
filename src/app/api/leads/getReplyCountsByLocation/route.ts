import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { aggregateReplyCountsByLocation } from "@/lib/whatsapp/replyStatusResolver";

connectDb();

export const dynamic = "force-dynamic";

function buildLeadQuery(
  validLocations: string[],
  days: string | null,
  createdBy: string | null,
  role: string | undefined,
  assignedArea: unknown,
): Record<string, unknown> {
  let query: Record<string, unknown> = {
    leadStatus: { $nin: ["rejected", "declined"] },
    location: {
      $in: validLocations.map((loc: string) => new RegExp(loc, "i")),
    },
  };

  if (days) {
    switch (days) {
      case "yesterday":
        query.createdAt = {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        };
        break;
      case "last month": {
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1,
        );
        query.createdAt = {
          $gte: startOfLastMonth,
          $lt: startOfThisMonth,
        };
        break;
      }
      case "this month": {
        const now2 = new Date();
        const startUTC = new Date(
          Date.UTC(now2.getUTCFullYear(), now2.getUTCMonth(), 1, 0, 0, 0, 0),
        );
        const endUTC = new Date(
          Date.UTC(
            now2.getUTCFullYear(),
            now2.getUTCMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          ),
        );
        query.createdAt = {
          $gte: startUTC,
          $lte: endUTC,
        };
        break;
      }
      case "10 days":
        query.createdAt = {
          $gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1 year":
        query.createdAt = {
          $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        };
        break;
    }
  }

  if (createdBy && createdBy !== "All") {
    query.createdBy = createdBy;
  }

  if (
    role !== "SuperAdmin" &&
    role !== "Sales-TeamLead" &&
    role !== "LeadGen-TeamLead" &&
    role !== "Advert"
  ) {
    if (assignedArea) {
      const areaLower: string[] = Array.isArray(assignedArea)
        ? assignedArea.map((a) => String(a).toLowerCase())
        : [String(assignedArea).toLowerCase()];
      query.location = {
        $in: validLocations
          .filter((loc: string) =>
            areaLower.some(
              (area: string) => loc.includes(area) || area.includes(loc),
            ),
          )
          .map((loc: string) => new RegExp(loc, "i")),
      };
    }
  }

  return query;
}

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

    const query = buildLeadQuery(
      validLocations,
      days,
      createdBy,
      role,
      assignedArea,
    );

    const leads = await Query.find(query)
      .select("phoneNo location")
      .lean();

    const finalResult = await aggregateReplyCountsByLocation(
      leads as Array<{ phoneNo?: string | number; location?: string }>,
      validLocations,
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
