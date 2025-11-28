import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import Employee from "@/models/employee";   // ⭐ ADD THIS
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = await getDataFromToken(request);
  
  try {
    const url = request.nextUrl;
    const month = url.searchParams.get("month");

    if (!month) {
      return NextResponse.json(
        { message: "Month parameter is required (format: YYYY-MM)" },
        { status: 400 }
      );
    }

    const [year, monthNum] = month.split("-").map(Number);
    
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

    // ⭐ GET ALL EMAILS OF LEADGEN EMPLOYEES
    const leadGenEmployees = await Employee.find({ role: "LeadGen" }).select("email");
    const leadGenEmails = leadGenEmployees.map(e => e.email);

    // ⭐ FORCE LEADGEN-ONLY FILTERING FOR EVERY USER
    let matchQuery: Record<string, any> = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      createdBy: { $in: leadGenEmails } // ⭐ VERY IMPORTANT
    };

    // ⭐ IGNORE 'token.role' COMPLETELY — ALWAYS FILTER BY LEADGEN
    // (we no longer use your old role-based logic)

    // Aggregation: group by createdBy
    const monthlyStats = await Query.aggregate([
      {
        $match: matchQuery
      },
      {
        $group: {
          _id: "$createdBy",
          totalQueries: { $sum: 1 },
          details: { $push: "$$ROOT" }
        }
      },
      {
        $sort: { totalQueries: -1 }
      }
    ]);

    // Also return full list for the UI table
    const allQueries = await Query.find(matchQuery)
      .sort({ _id: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      month,
      stats: monthlyStats,
      queries: allQueries,
      totalQueries: allQueries.length,
    });
    
  } catch (error: any) {
    console.error("Error in GET monthly stats:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch monthly stats",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
