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

    console.log("Received offer letter data:", formData);

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

    // Update candidate with offer letter details
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "selectionDetails.signedOfferLetterPdfUrl": signedPdfUrl,
          "selectionDetails.offerLetterSigned": true,
          "selectionDetails.offerLetterSignedAt": new Date(),
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
