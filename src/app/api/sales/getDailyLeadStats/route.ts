import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyEmployeeRentalTypeLeadFilter } from "@/lib/enforceEmployeeRentalType";
import { getLeadGenEmployeeEmails } from "@/lib/leads/leadGenEmailCache";
import { loadEmployeeLeadContext } from "@/lib/leads/employeeLeadContext";
import { COMPARE_DAILY_PROJECTION } from "@/lib/leads/compareLeadFields";
import { buildCreatedAtRangeQuery } from "@/lib/leads/istDateRange";

connectDb();
export const dynamic = "force-dynamic";

interface GroupedDayEmployeeStat {
  createdBy: string;
  date: string;
  count: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await getDataFromToken(request);
    const url = request.nextUrl;
    const fromDate = url.searchParams.get("fromDate");
    const toDate = url.searchParams.get("toDate");
    const createdBy = url.searchParams.get("createdBy");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { message: "fromDate and toDate are required (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const matchQuery: Record<string, unknown> = {
      ...buildCreatedAtRangeQuery(fromDate, toDate),
    };

    if (createdBy) {
      matchQuery.createdBy = createdBy;
    } else if (token.role === "LeadGen") {
      matchQuery.createdBy = token.email;
    } else {
      const leadGenEmails = await getLeadGenEmployeeEmails();
      matchQuery.createdBy = { $in: leadGenEmails };
    }

    const employeeId = String((token as { id?: string })?.id || "");
    const employeeContext = await loadEmployeeLeadContext(
      employeeId,
      token.rentalType,
    );
    const scopedQuery = await applyEmployeeRentalTypeLeadFilter(
      matchQuery,
      token,
      employeeContext.rentalType,
    );

    const [facetResult] = await Query.aggregate([
      { $match: scopedQuery },
      {
        $facet: {
          leads: [
            { $project: COMPARE_DAILY_PROJECTION },
            { $sort: { createdAt: -1 } },
          ],
          byDayEmployee: [
            {
              $addFields: {
                istDate: {
                  $dateToString: {
                    date: { $add: ["$createdAt", 5.5 * 60 * 60 * 1000] },
                    format: "%Y-%m-%d",
                    timezone: "UTC",
                  },
                },
              },
            },
            {
              $group: {
                _id: { createdBy: "$createdBy", date: "$istDate" },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                createdBy: "$_id.createdBy",
                date: "$_id.date",
                count: 1,
              },
            },
            { $sort: { date: -1, createdBy: 1 } },
          ],
        },
      },
    ]);

    const data = facetResult?.leads ?? [];
    const groupedStats: GroupedDayEmployeeStat[] =
      facetResult?.byDayEmployee ?? [];
    const totalQueries = data.length;

    return NextResponse.json({
      data,
      totalQueries,
      groupedStats,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error("Error in getDailyLeadStats:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch daily lead stats",
        error: err?.message,
      },
      { status: 500 },
    );
  }
}
