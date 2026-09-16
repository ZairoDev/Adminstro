import Candidate from "@/models/candidate";
// Register OfficeAddress so populate("officeAddressId") works on every request.
import "@/models/officeAddress";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";
import {
  isCompleteOnboardingBankDetails,
  normalizeOnboardingBankDetails,
} from "@/lib/people/onboarding-documents";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const candidate = await Candidate.findById(id).populate("officeAddressId");

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object supporting nested fields (dot notation)
    const updateData: Record<string, any> = {};
    
    // Handle flat fields
    if (body.status) updateData.status = body.status;
    if (body.position) updateData.position = body.position;
    if (body.employmentType === "fulltime" || body.employmentType === "intern") {
      updateData.employmentType = body.employmentType;
    } else if (body.employmentType === null) {
      updateData.employmentType = null;
    }
    if (body.isImportant !== undefined) updateData.isImportant = body.isImportant;
    if (body.interviewAttendance !== undefined) {
      // Validate interviewAttendance value
      if (body.interviewAttendance === null || 
          body.interviewAttendance === "appeared" || 
          body.interviewAttendance === "not_appeared") {
        updateData.interviewAttendance = body.interviewAttendance;
      }
    }
    if (body.officeAddressId !== undefined) {
      if (body.officeAddressId === null || body.officeAddressId === "") {
        updateData.officeAddressId = null;
      } else {
        const OfficeAddress = (await import("@/models/officeAddress")).default;
        const mongoose = await import("mongoose");
        if (!mongoose.default.Types.ObjectId.isValid(String(body.officeAddressId))) {
          return NextResponse.json(
            { success: false, error: "Invalid office address id" },
            { status: 400 },
          );
        }
        const officeDoc = await OfficeAddress.findById(body.officeAddressId).select(
          "_id city",
        );
        if (!officeDoc) {
          return NextResponse.json(
            { success: false, error: "Office address not found" },
            { status: 404 },
          );
        }
        updateData.officeAddressId = officeDoc._id;
        updateData.officeLocation = officeDoc.city ?? null;
      }
    }
    // Handle additionalDocuments array
    if (body.additionalDocuments !== undefined) {
      updateData.additionalDocuments = body.additionalDocuments;
    }
    
    // Handle nested fields using dot notation (e.g., "trainingAgreementDetails.signedHrPoliciesPdfUrl", "selectionDetails.role")
    Object.keys(body).forEach((key) => {
      if (key.includes(".")) {
        updateData[key] = body[key];
      }
    });
    
    // Also handle selectionDetails as an object if provided
    if (body.selectionDetails && typeof body.selectionDetails === "object") {
      Object.keys(body.selectionDetails).forEach((key) => {
        updateData[`selectionDetails.${key}`] = body.selectionDetails[key];
      });
    }

    if (body.onboardingBankUpdate && typeof body.onboardingBankUpdate === "object") {
      const token = await getDataFromToken(request);
      const userRole = token.role as string;

      if (!["HR", "SuperAdmin"].includes(userRole)) {
        return NextResponse.json(
          { success: false, error: "Unauthorized. Only HR and SuperAdmin can edit bank details." },
          { status: 403 }
        );
      }

      const bank = normalizeOnboardingBankDetails(
        body.onboardingBankUpdate as Record<string, unknown>
      );
      if (!isCompleteOnboardingBankDetails(bank)) {
        return NextResponse.json(
          { success: false, error: "Please fill all bank details" },
          { status: 400 }
        );
      }

      const optionalUrl = (value: unknown): string | null =>
        typeof value === "string" && value.trim() ? value.trim() : null;
      const cancelledCheque = bank.hasBankAccount
        ? optionalUrl(body.onboardingBankUpdate.cancelledCheque)
        : null;
      const passbookPhoto = bank.hasBankAccount
        ? optionalUrl(body.onboardingBankUpdate.passbookPhoto)
        : null;

      if (bank.hasBankAccount && !cancelledCheque) {
        return NextResponse.json(
          { success: false, error: "Please upload a cancelled cheque" },
          { status: 400 }
        );
      }

      const existingCandidate = await Candidate.findById(id).select(
        "onboardingDetails.documents"
      );
      if (!existingCandidate) {
        return NextResponse.json(
          { success: false, error: "Candidate not found" },
          { status: 404 }
        );
      }

      updateData["onboardingDetails.bankDetails"] = bank;
      updateData["onboardingDetails.documents.cancelledCheque"] = cancelledCheque;
      updateData["onboardingDetails.documents.passbookPhoto"] = passbookPhoto;

      const previousCheque =
        existingCandidate.onboardingDetails?.documents?.cancelledCheque || null;
      const previousPassbook =
        existingCandidate.onboardingDetails?.documents?.passbookPhoto || null;
      if (previousCheque !== cancelledCheque) {
        updateData["onboardingDetails.documentVerification.cancelledCheque"] = {
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
        };
      }
      if (previousPassbook !== passbookPhoto) {
        updateData["onboardingDetails.documentVerification.passbookPhoto"] = {
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
        };
      }
    }

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).populate("officeAddressId");

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Error updating candidate:", error);
    if (error instanceof Error && error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}
