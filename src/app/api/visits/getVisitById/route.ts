import Visits from "@/models/visit";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    // Auth first (avoid accidental logout from non-auth errors)
    try {
      await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const { visitId } = await req.json();
    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const visit = await Visits.findById(visitId).populate({
      path: "lead",
      select: "name phoneNo",
    });

    if (!visit) {
      return NextResponse.json(
        { error: "Lead is not available for this Id" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: visit }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch visit" },
      { status: 500 },
    );
  }
}
