import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await connectDb();

  try {
    const { searchParams } = new URL(request.url);
    // console.log("Search Params:", searchParams);

    // Parse query parameters
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const position = searchParams.get("position") || "";
    const experienceFilter = searchParams.get("experienceFilter") || "";
    const onboarded = searchParams.get("onboarded") === "true";

    const skip = (page - 1) * limit;

    // Build the query object
    let query: any = {};

    // Add search conditions if search term exists
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Add status filter if status is provided and not "all"
    if (status && status !== "all") {
      query.status = status;
    }

    // Add onboarded filter
    if (onboarded) {
      query["onboardingDetails.onboardingComplete"] = true;
    }

    // Add position/role filter
    if (position && position !== "all") {
      query.position = position;
    }

    // Add experience filter
    if (experienceFilter === "fresher") {
      query.experience = 0;
    } else if (experienceFilter === "experienced") {
      query.experience = { $gt: 0 };
    }

    // Get total count with the query
    const total = await Candidate.countDocuments(query);

    // Fetch candidates with pagination
    const candidates = await Candidate.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // console.log("Query:", query);
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
    console.error("Error fetching candidates:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidates" },
      { status: 500 }
    );
  }
}

// Optional: Add PATCH endpoint to update candidate status
export async function PATCH(request: NextRequest) {
  await connectDb();

  try {
    const body = await request.json();
    const { candidateId, status } = body;

    if (!candidateId || !status) {
      return NextResponse.json(
        { success: false, error: "Candidate ID and status are required" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ["pending", "shortlisted", "selected", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { status },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
    });
  } catch (error) {
    console.error("Error updating candidate status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update candidate status" },
      { status: 500 }
    );
  }
}
