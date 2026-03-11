import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { id, disposition, dispositionReason } = await req.json();

    if (!id || !disposition) {
      return NextResponse.json(
        { success: false, message: "ID and disposition are required" },
        { status: 400 }
      );
    }

    const existingQuery = await Query.findById(id);
    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    existingQuery.leadStatus = disposition;
    existingQuery.reason = dispositionReason || "";
    await existingQuery.save({ validateBeforeSave: false });

    return NextResponse.json(
      { success: true, data: existingQuery },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("❌ Error updating disposition:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
