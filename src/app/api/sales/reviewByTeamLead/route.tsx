import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

const REVIEW_ROLES = new Set(["LeadGen-TeamLead", "SuperAdmin"]);

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const role = String(token.role || "");
    if (!REVIEW_ROLES.has(role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const { id, leadQualityByTeamLead } = await req.json();
    if (!id || !leadQualityByTeamLead) {
      return NextResponse.json(
        { success: false, message: "ID and leadQuality are required" },
        { status: 400 }
      );
    }
    const validLeadQualities = ["Approved", "Not Approved"];
    if (!validLeadQualities.includes(leadQualityByTeamLead)) {
      return NextResponse.json(
        { success: false, message: "Invalid leadQuality value" },
        { status: 400 }
      );
    }
    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { leadQualityByTeamLead },
      { timestamps: false }
      // { new: true },
    );
    if (!updatedQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updatedQuery }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { success: false, code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error(error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
