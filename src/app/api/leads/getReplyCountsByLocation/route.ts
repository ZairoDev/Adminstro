import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const role = token?.role;
    const assignedArea = token?.allotedArea;

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const days = searchParams.get("days");
    const createdBy = searchParams.get("createdBy");

    // Fetch distinct cities from MonthlyTarget
    const monthlyTargets = await MonthlyTarget.find({}).select("city").lean();
    const validLocations: string[] = monthlyTargets
      .map((t: any) => t.city)
      .filter((city: any): city is string => Boolean(city) && typeof city === "string")
      .map((city: string) => city.toLowerCase());

    if (validLocations.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Build base query - exclude rejected/declined leads
    let query: any = {
      leadStatus: { $nin: ["rejected", "declined"] },
      location: { $in: validLocations.map((loc: string) => new RegExp(loc, "i")) },
    };

    // Add date filter
    if (days) {
      switch (days) {
        case "yesterday":
          query.createdAt = {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          };
          break;
        case "last month":
          const now = new Date();
          const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfLastMonth = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
          );
          query.createdAt = {
            $gte: startOfLastMonth,
            $lt: startOfThisMonth,
          };
          break;
        case "this month":
          const now2 = new Date();
          const startUTC = new Date(
            Date.UTC(now2.getUTCFullYear(), now2.getUTCMonth(), 1, 0, 0, 0, 0)
          );
          const endUTC = new Date(
            Date.UTC(
              now2.getUTCFullYear(),
              now2.getUTCMonth() + 1,
              0,
              23,
              59,
              59,
              999
            )
          );
          query.createdAt = {
            $gte: startUTC,
            $lte: endUTC,
          };
          break;
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

    // Add createdBy filter
    if (createdBy && createdBy !== "All") {
      query.createdBy = createdBy;
    }

    // Apply location restrictions for non-admin/team lead roles
    if (role !== "SuperAdmin" && role !== "Sales-TeamLead" && role !== "LeadGen-TeamLead" && role !== "Advert") {
      if (assignedArea) {
        const areaLower: string[] = Array.isArray(assignedArea)
          ? assignedArea.map((a: any) => String(a).toLowerCase())
          : [String(assignedArea).toLowerCase()];
        query.location = {
          $in: validLocations
            .filter((loc: string) => areaLower.some((area: string) => loc.includes(area) || area.includes(loc)))
            .map((loc: string) => new RegExp(loc, "i")),
        };
      }
    }

    // Aggregate pipeline to get reply counts by location
    const pipeline = [
      { $match: query },
      {
        $addFields: {
          locationLower: { $toLower: { $ifNull: ["$location", "Unknown"] } },
        },
      },
      {
        $group: {
          _id: {
            location: "$locationLower",
          },
          replied: {
            $sum: {
              $cond: [{ $eq: ["$firstReply", true] }, 1, 0],
            },
          },
          notReplied: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$firstReply", false] },
                    { $eq: ["$firstReply", null] },
                    { $not: ["$firstReply"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          notDelivered: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$whatsappLastErrorCode", null] }, { $ne: ["$whatsappLastErrorCode", undefined] }] },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          location: "$_id.location",
          replied: 1,
          notReplied: 1,
          notDelivered: 1,
          total: 1,
        },
      },
    ];

    const result = await Query.aggregate(pipeline);

    // Create a map of results for quick lookup
    const resultMap = new Map<string, any>();
    result.forEach((item: any) => {
      resultMap.set(item.location, item);
    });

    // Ensure all locations from monthlyTargets are included, even with 0 counts
    const finalResult = validLocations.map((loc: string) => {
      const existing = resultMap.get(loc);
      if (existing) {
        return existing;
      }
      return {
        location: loc,
        replied: 0,
        notReplied: 0,
        notDelivered: 0,
        total: 0,
      };
    });

    // Sort by location name
    finalResult.sort((a: any, b: any) => a.location.localeCompare(b.location));

    return NextResponse.json({
      success: true,
      data: finalResult,
    });
  } catch (error: any) {
    console.error("Error fetching reply counts by location:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error fetching reply counts by location",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
