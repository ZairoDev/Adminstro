import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const formData = await request.formData();

    // console.log("Received training agreement data:", formData);

    // Parse form data
    const signature = formData.get("signature") as string;
    const signedPdfUrl = formData.get("signedPdfUrl") as string;
    const agreementAccepted = formData.get("agreementAccepted") === "true";

    if (!signature || !signedPdfUrl) {
      return NextResponse.json(
        { success: false, error: "Signature and signed PDF URL are required" },
        { status: 400 }
      );
    }

    const existing = await Candidate.findById(id).select(
      "status trainingAgreementDetails.signingLink trainingAgreementDetails.signedPdfUrl trainingAgreementDetails.signedLetterOfIntentPdfUrl"
    );
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }
    const previousPacket = Boolean(
      existing.trainingAgreementDetails?.signingLink ||
      existing.trainingAgreementDetails?.signedPdfUrl ||
      existing.trainingAgreementDetails?.signedLetterOfIntentPdfUrl
    );
    if (!previousPacket) {
      return NextResponse.json(
        { success: false, error: "The offer letter and HR policies are the documents for this selection" },
        { status: 400 }
      );
    }

    // Update candidate with training agreement details
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "trainingAgreementDetails.eSign": {
            signatureImage: signature,
            signedAt: new Date(),
          },
          "trainingAgreementDetails.signedPdfUrl": signedPdfUrl,
          "trainingAgreementDetails.agreementAccepted": agreementAccepted,
          "trainingAgreementDetails.agreementAcceptedAt": new Date(),
          "trainingAgreementDetails.agreementComplete": true,
          "trainingAgreementDetails.completedAt": new Date(),
        },
      },
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
      message: "Training agreement completed successfully",
    });
  } catch (error) {
    console.error("Training agreement error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete training agreement" },
      { status: 500 }
    );
  }
}



