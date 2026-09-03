import Visits from "@/models/visit";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { assertCanAccessVisit } from "@/lib/visits/visitAuth";
import { handleVisitServiceError } from "@/lib/visits/visitApiErrors";
import { connectDb } from "@/util/db";

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const { visitId } = await req.json();

    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    await connectDb();

    const visit = await Visits.findById(visitId).populate({
      path: "lead",
      select: "name phoneNo",
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Lead is not available for this Id" },
        { status: 404 },
      );
    }

    assertCanAccessVisit(
      { createdBy: visit.createdBy },
      { email: String(token.email), role: String(token.role) },
    );

    return NextResponse.json({ data: visit }, { status: 200 });
  } catch (error) {
    return handleVisitServiceError(error);
  }
}
