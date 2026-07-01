import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getLeadGenEmployeeEmails } from "@/lib/leads/leadGenEmailCache";
import { COMPARE_LEAD_LIST_PROJECTION } from "@/lib/leads/compareLeadFields";

connectDb();
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = await getDataFromToken(request);

  try {
    const url = request.nextUrl;
    const month = url.searchParams.get("month");
    const createdByFilter = url.searchParams.get("createdBy");

    if (!month) {
      return NextResponse.json(
        { message: "Month parameter is required (format: YYYY-MM)" },
        { status: 400 },
      );
    }

    const [year, monthNum] = month.split("-").map(Number);

    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    const leadGenEmails = await getLeadGenEmployeeEmails();

    let matchQuery: Record<string, unknown> = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      createdBy: { $in: leadGenEmails },
    };

    if (token.role === "LeadGen" && token.email) {
      matchQuery.createdBy = token.email;
    }

    if (createdByFilter) {
      matchQuery.createdBy = createdByFilter;
    }

    const monthlyStats = await Query.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$createdBy",
          totalQueries: { $sum: 1 },
        },
      },
      { $sort: { totalQueries: -1 } },
    ]);

    const allQueries = await Query.find(matchQuery, COMPARE_LEAD_LIST_PROJECTION)
      .sort({ _id: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      month,
      stats: monthlyStats,
      queries: allQueries,
      totalQueries: allQueries.length,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error in GET monthly stats:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch monthly stats",
        error: err?.message,
      },
      { status: 500 },
    );
  }
}
