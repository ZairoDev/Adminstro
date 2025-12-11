import { NextRequest, NextResponse } from "next/server";
import WebsiteLeads from "@/models/websiteLeads";
import { connectDb } from "@/util/db";

connectDb();
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "firstName";

    let query: Record<string, any> = {};

    if (searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      if (searchType === "name") {
        query.$or = [
          { firstName: regex },
          { lastName: regex },
        ];
      } else {
        query[searchType] = regex;
      }
    }

    const leads = await WebsiteLeads.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLeads = await WebsiteLeads.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / limit);

    return NextResponse.json({
      data: leads,
      page,
      totalPages,
      totalLeads,
    });
  } catch (error: any) {
    console.error("Error fetching website leads:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch website leads",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

