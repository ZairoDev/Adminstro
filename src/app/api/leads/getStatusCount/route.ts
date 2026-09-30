import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyEmployeeRentalTypeLeadFilter } from "@/lib/enforceEmployeeRentalType";
import { loadEmployeeLeadContext } from "@/lib/leads/employeeLeadContext";
import { parseAssignedAreasFromToken } from "@/util/guestLeadLocationScope";
import {
  applyGuestPropertyTypeAllowListToLeadQuery,
  isPropertyTypeRuleBypassRole,
} from "@/util/propertyTypeAllowList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

connectDb();

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const rentalTypeQuery = await applyEmployeeRentalTypeLeadFilter({}, token);
    const employeeId = String((token as { id?: string }).id || "");
    const employeeContext = await loadEmployeeLeadContext(
      employeeId,
      (token as { rentalType?: unknown }).rentalType,
    );
    const bypassPropertyTypeRule = isPropertyTypeRuleBypassRole(
      String((token as { role?: string }).role || ""),
    );
    const assignedAreas = parseAssignedAreasFromToken(
      (token as { allotedArea?: unknown }).allotedArea,
    );
    const propertyTypeQuery: Record<string, unknown> = {};
    const propertyTypeResult = applyGuestPropertyTypeAllowListToLeadQuery({
      query: propertyTypeQuery,
      ownerRules: bypassPropertyTypeRule
        ? null
        : employeeContext.ownerPropertyTypeVisibilityRules,
      propertyVisibilityRules: bypassPropertyTypeRule
        ? null
        : employeeContext.propertyVisibilityRules,
      locations: assignedAreas.length > 0 ? assignedAreas : null,
    });
    const emptySummary = {
      First: {},
      Second: {},
      Third: {},
      Fourth: {},
      Options: {},
      Visit: {},
    };
    if (propertyTypeResult.impossible) {
      return NextResponse.json({ success: true, statusSummary: emptySummary });
    }
    const statusPipeline = [
  ...(Object.keys(propertyTypeQuery).length > 0
    ? [{ $match: propertyTypeQuery }]
    : []),
  ...(rentalTypeQuery.bookingTerm
    ? [{ $match: { bookingTerm: rentalTypeQuery.bookingTerm } }]
    : []),
  {
    $match: {
      leadStatus: { $nin: ["rejected","declined" ] },
    },
  },

  {
    $match: {
      messageStatus: {
        $in: ["First", "Second", "Third", "Fourth", "Options", "Visit"],
      },
    },
  },


  {
    $group: {
      _id: {
        messageStatus: "$messageStatus",
        location: { $ifNull: ["$location", "UnknownLocation"] },
      },
      count: { $sum: 1 },
    },
  },

  
  {
    $group: {
      _id: "$_id.messageStatus",
      cities: {
        $push: {
          k: "$_id.location",
          v: "$count",
        },
      },
    },
  },

 
  {
    $project: {
      _id: 0,
      messageStatus: "$_id",
      cityCounts: { $arrayToObject: "$cities" },
    },
  },

  
  {
    $group: {
      _id: null,
      data: {
        $push: {
          k: "$messageStatus",
          v: "$cityCounts",
        },
      },
    },
  },
  {
    $replaceRoot: {
      newRoot: { $arrayToObject: "$data" },
    },
  },

  {
    $addFields: {
      First: { $ifNull: ["$First", {}] },
      Second: { $ifNull: ["$Second", {}] },
      Third: { $ifNull: ["$Third", {}] },
      Fourth: { $ifNull: ["$Fourth", {}] },
      Options: { $ifNull: ["$Options", {}] },
      Visit: { $ifNull: ["$Visit", {}] },
    },
  },

  {
    $project: {
      First: 1,
      Second: 1,
      Third: 1,
      Fourth: 1,
      Options: 1,
      Visit: 1,
      _id: 0
    },
  },
];

    const result = await Query.aggregate(statusPipeline);
    return NextResponse.json({
      success: true,
      statusSummary: result[0] || {
        First: {},
        Second: {},
        Third: {},
        Fourth: {},
        Options: {},
        Visit: {},
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("Error fetching status count:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching status summary" },
      { status: 500 }
    );
  }
}