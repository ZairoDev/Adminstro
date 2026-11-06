import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";
import Candidate from "@/models/candidate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const formData = await request.formData();



    // Parse form data
    const signature = formData.get("signature") as string;
    const signedPdfUrl = formData.get("signedPdfUrl") as string;
    const signedHrPoliciesPdfUrl = formData.get("signedHrPoliciesPdfUrl") as string;
    const unsignedPdfUrl = formData.get("unsignedPdfUrl") as string | null;

    if (!signature || !signedPdfUrl || !signedHrPoliciesPdfUrl) {
      return NextResponse.json(
        { success: false, error: "The offer letter, HR policies, and a signature are required" },
        { status: 400 }
      );
    }

    const existing = await Candidate.findById(id).select(
      "status selectionDetails.signedOfferLetterPdfUrl trainingAgreementDetails.signedHrPoliciesPdfUrl"
    );
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }
    if (existing.status !== "selected" && existing.status !== "onboarding") {
      return NextResponse.json(
        { success: false, error: "These documents can only be signed after the candidate is selected" },
        { status: 400 }
      );
    }
    if (
      existing.selectionDetails?.signedOfferLetterPdfUrl &&
      existing.trainingAgreementDetails?.signedHrPoliciesPdfUrl
    ) {
      return NextResponse.json(
        { success: false, error: "These documents are already signed" },
        { status: 409 }
      );
    }

    const signedAt = new Date();
    const updateData: Record<string, unknown> = {
      "selectionDetails.signedOfferLetterPdfUrl": signedPdfUrl,
      "selectionDetails.offerLetterSigned": true,
      "selectionDetails.offerLetterSignedAt": signedAt,
      "selectionDetails.offerLetterSignature": signature,
      "trainingAgreementDetails.signedHrPoliciesPdfUrl": signedHrPoliciesPdfUrl,
      "trainingAgreementDetails.hrPoliciesSignedAt": signedAt,
      "trainingAgreementDetails.eSign.signatureImage": signature,
      "trainingAgreementDetails.eSign.signedAt": signedAt,
    };

    if (unsignedPdfUrl && !unsignedPdfUrl.startsWith("blob:")) {
      updateData["selectionDetails.unsignedOfferLetterPdfUrl"] = unsignedPdfUrl;
    }

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: candidate,
      message: "Offer letter completed successfully",
    });
  } catch (error) {
    console.error("Offer letter error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save offer letter" },
      { status: 500 }
    );
  }
}
