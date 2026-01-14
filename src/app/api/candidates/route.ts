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
    const collegeFilter = searchParams.get("college") || "";
    const onboarded = searchParams.get("onboarded") === "true";
    const onboardingStatus = searchParams.get("onboardingStatus") || "";

    const skip = (page - 1) * limit;

    // Build the query object
    let query: any = {};
    const andConditions: any[] = [];

    // Add onboarded filter - includes both completed and pending onboarding
    if (onboarded) {
      andConditions.push({
        $or: [
          { "onboardingDetails.onboardingComplete": true },
          { status: "onboarding" },
        ],
      });
    }

    // Add onboarding status filter for onboarded candidates
    // Note: We'll filter in memory after fetching for more reliable results
    // This is because document verification structure can be complex

    // Add search conditions if search term exists
    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      });
    }

    // Add status filter if status is provided and not "all"
    // Note: Don't override status if onboarded filter is active
    if (status && status !== "all" && !onboarded) {
      // Special handling for interview status: include candidates with second round interviews
      if (status === "interview") {
        // Add to andConditions to properly combine with other filters
        andConditions.push({
          $or: [
            { status: "interview" },
            { "secondRoundInterviewDetails.scheduledDate": { $exists: true, $ne: null } },
          ],
        });
      } else {
        query.status = status;
      }
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

    // Add college filter - use exact match with case-insensitive comparison
    // Handle whitespace variations by matching with optional leading/trailing spaces
    if (collegeFilter && collegeFilter !== "all") {
      // Trim and escape special regex characters
      const trimmedCollege = collegeFilter.trim();
      const escapedCollege = trimmedCollege.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match exact string with optional leading/trailing whitespace, case-insensitive
      query.college = { $regex: `^\\s*${escapedCollege}\\s*$`, $options: "i" };
    }

    // Combine $or conditions with $and, and merge other filters
    if (andConditions.length > 0) {
      if (Object.keys(query).length > 0) {
        query = {
          $and: [...andConditions, query],
        };
      } else {
        query = andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
      }
    }

    // Fetch all candidates matching the base query (for onboarding status filtering)
    let allCandidates = await Candidate.find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Filter by onboarding status if specified
    if (onboarded && onboardingStatus) {
      allCandidates = allCandidates.filter((candidate: any) => {
        const onboardingDetails = candidate.onboardingDetails || {};
        const documents = onboardingDetails.documents || {};
        const documentVerification = onboardingDetails.documentVerification || {};
        
        // Get list of document keys that have actual document values (not null/empty)
        const documentKeys = Object.keys(documents).filter((key) => {
          const docValue = documents[key];
          if (Array.isArray(docValue)) {
            return docValue.length > 0 && docValue.some((item: any) => item !== null && item !== undefined && item !== "");
          }
          return docValue !== null && docValue !== undefined && docValue !== "";
        });
        
        // Check if documents exist (has at least one document uploaded)
        const hasDocuments = documentKeys.length > 0;
        
        // Check if any document is verified
        const hasVerifiedDocuments = Object.values(documentVerification).some(
          (verification: any) => verification && verification.verified === true
        );

        // Check if ALL documents are verified
        const allDocumentsVerified = documentKeys.length > 0 && documentKeys.every((docKey) => {
          const verification = documentVerification[docKey];
          return verification && verification.verified === true;
        });

        // Check HR verification status
        const hrVerified = onboardingDetails.verifiedByHR?.verified === true;

        if (onboardingStatus === "pending") {
          // Pending: onboarding not complete OR no documents uploaded
          return !onboardingDetails.onboardingComplete || !hasDocuments;
        } else if (onboardingStatus === "uploaded-not-verified") {
          // Documents uploaded but not all verified (or HR not verified)
          return hasDocuments && (!allDocumentsVerified || !hrVerified);
        } else if (onboardingStatus === "verified") {
          // ALL documents verified AND HR verification complete
          return allDocumentsVerified && hrVerified;
        }
        
        return true;
      });
    }

    // Get total count after filtering
    const total = allCandidates.length;

    // Apply pagination
    const candidates = allCandidates.slice(skip, skip + limit);

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
    const validStatuses = ["pending", "interview", "shortlisted", "selected", "rejected", "onboarding"];
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
