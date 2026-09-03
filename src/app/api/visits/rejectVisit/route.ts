import Visits from "@/models/visit";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { cancelVisit } from "@/services/visits/visitService";
import { handleVisitServiceError } from "@/lib/visits/visitApiErrors";

/** @deprecated Use PATCH /api/visits/[id]/cancel instead */
export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const { id, rejectionReason } = await req.json();

    if (!id || !rejectionReason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDb();

    const visit = await cancelVisit({
      visitId: id,
      reason: rejectionReason,
      actor: {
        email: String(token.email),
        role: String(token.role),
      },
    });

    return NextResponse.json({ success: true, data: visit }, { status: 200 });
  } catch (error) {
    return handleVisitServiceError(error);
  }
}
