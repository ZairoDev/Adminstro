import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { parseLocalDateString } from "@/lib/utils";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ONBOARDING_DOCUMENT_FIELDS = [
  "aadharCard",
  "aadharCardFront",
  "aadharCardBack",
  "panCard",
  "highSchoolMarksheet",
  "interMarksheet",
  "graduationMarksheet",
  "experienceLetter",
  "relievingLetter",
] as const;

type OnboardingStatusTab =
  | "employed"
  | "exited"
  | "pending"
  | "uploaded-not-verified"
  | "verified";

function isOnboardingStatusTab(value: string): value is OnboardingStatusTab {
  return (
    value === "employed" ||
    value === "exited" ||
    value === "pending" ||
    value === "uploaded-not-verified" ||
    value === "verified"
  );
}

function notEmployedQuery(): Record<string, unknown> {
  return {
    $or: [{ employeeId: null }, { employeeId: { $exists: false } }],
  };
}

function hasUploadedDocumentsQuery(): Record<string, unknown> {
  return {
    $or: [
      ...ONBOARDING_DOCUMENT_FIELDS.map((field) => ({
        [`onboardingDetails.documents.${field}`]: { $nin: [null, ""] },
      })),
      { "onboardingDetails.documents.salarySlips.0": { $nin: [null, ""] } },
    ],
  };
}

function hasNoUploadedDocumentsQuery(): Record<string, unknown> {
  return {
    $and: [
      ...ONBOARDING_DOCUMENT_FIELDS.map((field) => ({
        $or: [
          { [`onboardingDetails.documents.${field}`]: null },
          { [`onboardingDetails.documents.${field}`]: { $exists: false } },
          { [`onboardingDetails.documents.${field}`]: "" },
        ],
      })),
      {
        $or: [
          { "onboardingDetails.documents.salarySlips": { $exists: false } },
          { "onboardingDetails.documents.salarySlips": null },
          { "onboardingDetails.documents.salarySlips": { $size: 0 } },
        ],
      },
    ],
  };
}

function onboardingStatusMongoQuery(
  onboardingStatus: OnboardingStatusTab
): Record<string, unknown>[] {
  if (onboardingStatus === "employed") {
    return [
      {
        employeeId: { $ne: null },
        exitedAt: null,
        "onboardingDetails.onboardingComplete": true,
      },
    ];
  }

  if (onboardingStatus === "exited") {
    return [{ exitedAt: { $ne: null } }];
  }

  if (onboardingStatus === "pending") {
    return [
      notEmployedQuery(),
      {
        $or: [
          { "onboardingDetails.onboardingComplete": { $ne: true } },
          hasNoUploadedDocumentsQuery(),
        ],
      },
    ];
  }

  if (onboardingStatus === "verified") {
    return [
      {
        "onboardingDetails.verifiedByHR.verified": true,
        employeeId: null,
      },
    ];
  }

  // uploaded-not-verified: document-count check stays partial in-memory
  return [notEmployedQuery(), hasUploadedDocumentsQuery()];
}

function documentHasValue(docValue: unknown): boolean {
  if (Array.isArray(docValue)) {
    return docValue.some(
      (item) => item !== null && item !== undefined && item !== ""
    );
  }
  return docValue !== null && docValue !== undefined && docValue !== "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function matchesUploadedNotVerified(candidate: {
  onboardingDetails?: unknown;
}): boolean {
  const onboardingDetails = asRecord(candidate.onboardingDetails);
  if (!onboardingDetails) {
    return false;
  }
  const documents = asRecord(onboardingDetails.documents) ?? {};
  const documentVerification =
    asRecord(onboardingDetails.documentVerification) ?? {};
  const documentKeys = Object.keys(documents).filter((key) =>
    documentHasValue(documents[key])
  );
  const allDocumentsVerified =
    documentKeys.length > 0 &&
    documentKeys.every((docKey) => {
      const verification = asRecord(documentVerification[docKey]);
      return verification?.verified === true;
    });
  const verifiedByHR = asRecord(onboardingDetails.verifiedByHR);
  const hrVerified = verifiedByHR?.verified === true;
  return !allDocumentsVerified || !hrVerified;
}

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
    const appliedFrom = searchParams.get("appliedFrom") || "";
    const appliedTo = searchParams.get("appliedTo") || "";
    const phaseRaw = searchParams.get("phase") || "";
    const phase =
      phaseRaw === "applicant" ||
      phaseRaw === "onboarding" ||
      phaseRaw === "active" ||
      phaseRaw === "exited"
        ? phaseRaw
        : "";

    const skip = (page - 1) * limit;

    // Build the query object
    let query: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    // Phase is additive and independent of existing onboarded/status callers.
    // Map:
    // applicant  → not onboarded, status in pipeline
    // onboarding → onboarded, not employed/exited
    // active     → has employeeId, no exitedAt
    // exited     → has exitedAt
    if (phase === "applicant") {
      andConditions.push({
        status: { $in: ["pending", "interview", "shortlisted", "selected"] },
      });
    } else if (phase === "onboarding") {
      andConditions.push({
        $or: [
          { "onboardingDetails.onboardingComplete": true },
          { status: "onboarding" },
        ],
      });
      andConditions.push({
        $or: [{ employeeId: null }, { employeeId: { $exists: false } }],
      });
      andConditions.push({
        $or: [{ exitedAt: null }, { exitedAt: { $exists: false } }],
      });
    } else if (phase === "active") {
      andConditions.push({ employeeId: { $ne: null } });
      andConditions.push({
        $or: [{ exitedAt: null }, { exitedAt: { $exists: false } }],
      });
    } else if (phase === "exited") {
      andConditions.push({ exitedAt: { $ne: null } });
    }

    // Add onboarded filter - includes both completed and pending onboarding
    if (onboarded && !phase) {
      andConditions.push({
        $or: [
          { "onboardingDetails.onboardingComplete": true },
          { status: "onboarding" },
        ],
      });
    }

    // Legacy onboarding status filters (kept for backwards compatibility if needed)
    if (onboarded && isOnboardingStatusTab(onboardingStatus) && !phase) {
      andConditions.push(...onboardingStatusMongoQuery(onboardingStatus));
    }

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
    if (status && status !== "all" && !onboarded && !phase) {
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

    // Applied date filter on createdAt (local calendar days)
    const dateYmd = /^\d{4}-\d{2}-\d{2}$/;
    if (
      (appliedFrom && dateYmd.test(appliedFrom)) ||
      (appliedTo && dateYmd.test(appliedTo))
    ) {
      const createdAt: { $gte?: Date; $lte?: Date } = {};
      if (appliedFrom && dateYmd.test(appliedFrom)) {
        createdAt.$gte = parseLocalDateString(appliedFrom);
      }
      if (appliedTo && dateYmd.test(appliedTo)) {
        const end = parseLocalDateString(appliedTo);
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
      query.createdAt = createdAt;
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

    // Fetch candidates with standard pagination
    const total = await Candidate.countDocuments(query);
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
