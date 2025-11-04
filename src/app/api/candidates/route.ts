
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await connectDb();

  try { 
    const { searchParams } = new URL(request.url);
    // console.log("Search Params:", searchParams);
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { position: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    const total = await Candidate.countDocuments(query);
    const candidates = await Candidate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    // console.log("Fetched Candidates:", candidates);
    return NextResponse.json({
      success: true,
      data: candidates,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}
