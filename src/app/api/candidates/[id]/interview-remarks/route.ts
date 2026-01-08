import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";

// Valid options for each evaluation section
const EXPERIENCE_VALIDATION_OPTIONS = [
  "relevant experience for the role",
  "partial or transferable experience",
  "no experience (fresher)",
  "experience not relevant or exaggerated",
] as const;

const MOTHER_TONGUE_INFLUENCE_OPTIONS = [
  "no issue with clear communication",
  "minor manageable influence",
  "moderate influence needing improvement",
  "heavy influence creating a communication barrier",
] as const;

const ENGLISH_SPEAKING_OPTIONS = [
  "fluent and professional",
  "understandable with minor gaps",
  "basic with limited vocabulary",
  "poor and difficult to understand",
] as const;

const UNDERSTANDING_SCALE_OPTIONS = [
  "high grasp of concepts",
  "good understanding with explanation",
  "average but manageable understanding",
  "low understanding struggling with basics",
] as const;

const LISTENING_SKILLS_OPTIONS = [
  "active and accurate listening",
  "listening with missed details",
  "frequent interruptions or misunderstandings",
  "poor listening",
] as const;

const BASIC_PROFESSIONALISM_OPTIONS = [
  "punctual and respectful behavior",
  "minor professionalism gaps",
  "casual or inconsistent behavior",
  "unprofessional conduct",
] as const;

const STABILITY_SIGNALS_OPTIONS = [
  "stable with realistic expectations",
  "mostly stable with minor concerns",
  "some red flags such as job hopping or confusion",
  "high risk and unstable",
] as const;

// Save or update interview remarks
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    // Check authentication and role
    const token = await getDataFromToken(request);
    const userRole = token.role as string;
    const userId = token.id as string;
    let userName = token.name as string;

    // Only HR and SuperAdmin can save interview remarks
    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can save interview remarks." },
        { status: 403 }
      );
    }

    // Fetch employee name from database if not in token
    if (!userName && userId) {
      const employee = await Employee.findById(userId).select("name");
      userName = employee?.name || "HR Team";
    }

    const { id } = await params;
    const body = await request.json();
    const {
      experienceValidation,
      motherTongueInfluence,
      englishSpeaking,
      understandingScale,
      listeningSkills,
      basicProfessionalism,
      stabilitySignals,
      hrNotes,
    } = body;

    // Validate all required fields are provided
    if (
      !experienceValidation ||
      !motherTongueInfluence ||
      !englishSpeaking ||
      !understandingScale ||
      !listeningSkills ||
      !basicProfessionalism ||
      !stabilitySignals
    ) {
      return NextResponse.json(
        { success: false, error: "All evaluation sections are required" },
        { status: 400 }
      );
    }

    // Validate each option is valid
    if (!EXPERIENCE_VALIDATION_OPTIONS.includes(experienceValidation)) {
      return NextResponse.json(
        { success: false, error: "Invalid experience validation option" },
        { status: 400 }
      );
    }
    if (!MOTHER_TONGUE_INFLUENCE_OPTIONS.includes(motherTongueInfluence)) {
      return NextResponse.json(
        { success: false, error: "Invalid mother tongue influence option" },
        { status: 400 }
      );
    }
    if (!ENGLISH_SPEAKING_OPTIONS.includes(englishSpeaking)) {
      return NextResponse.json(
        { success: false, error: "Invalid English speaking option" },
        { status: 400 }
      );
    }
    if (!UNDERSTANDING_SCALE_OPTIONS.includes(understandingScale)) {
      return NextResponse.json(
        { success: false, error: "Invalid understanding scale option" },
        { status: 400 }
      );
    }
    if (!LISTENING_SKILLS_OPTIONS.includes(listeningSkills)) {
      return NextResponse.json(
        { success: false, error: "Invalid listening skills option" },
        { status: 400 }
      );
    }
    if (!BASIC_PROFESSIONALISM_OPTIONS.includes(basicProfessionalism)) {
      return NextResponse.json(
        { success: false, error: "Invalid basic professionalism option" },
        { status: 400 }
      );
    }
    if (!STABILITY_SIGNALS_OPTIONS.includes(stabilitySignals)) {
      return NextResponse.json(
        { success: false, error: "Invalid stability signals option" },
        { status: 400 }
      );
    }

    // Validate HR notes length (max 200 characters for 1-2 lines)
    if (hrNotes && hrNotes.length > 200) {
      return NextResponse.json(
        { success: false, error: "HR notes must be 200 characters or less" },
        { status: 400 }
      );
    }

    // Check if candidate exists
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Check if candidate has interview scheduled
    if (!candidate.interviewDetails?.scheduledDate) {
      return NextResponse.json(
        { success: false, error: "Interview must be scheduled before adding remarks" },
        { status: 400 }
      );
    }

    // Determine if this is a new entry or update
    const isNewEntry = !candidate.interviewDetails.remarks?.evaluatedBy;
    const updateData: Record<string, unknown> = {
      "interviewDetails.remarks.experienceValidation": experienceValidation,
      "interviewDetails.remarks.motherTongueInfluence": motherTongueInfluence,
      "interviewDetails.remarks.englishSpeaking": englishSpeaking,
      "interviewDetails.remarks.understandingScale": understandingScale,
      "interviewDetails.remarks.listeningSkills": listeningSkills,
      "interviewDetails.remarks.basicProfessionalism": basicProfessionalism,
      "interviewDetails.remarks.stabilitySignals": stabilitySignals,
      "interviewDetails.remarks.hrNotes": hrNotes || null,
      "interviewDetails.remarks.lastUpdatedBy": `${userName || "HR Team"} (${userRole})`,
      "interviewDetails.remarks.lastUpdatedAt": new Date(),
    };

    if (isNewEntry) {
      updateData["interviewDetails.remarks.evaluatedBy"] = `${userName || "HR Team"} (${userRole})`;
      updateData["interviewDetails.remarks.evaluatedAt"] = new Date();
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Failed to save interview remarks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: isNewEntry ? "Interview remarks saved successfully" : "Interview remarks updated successfully",
    });
  } catch (error: any) {
    console.error("Interview remarks error:", error);
    if (error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to save interview remarks" },
      { status: 500 }
    );
  }
}

// Get interview remarks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const candidate = await Candidate.findById(id).select("interviewDetails.remarks");

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: candidate.interviewDetails?.remarks || null,
    });
  } catch (error) {
    console.error("Error fetching interview remarks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch interview remarks" },
      { status: 500 }
    );
  }
}

