import { NextRequest, NextResponse } from "next/server";

import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

const ALLOWED_ROLES = new Set(["SuperAdmin", "HAdmin"]);

export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as {
      role?: string;
      email?: string;
      name?: string;
    } | null;
    if (!token?.role || !ALLOWED_ROLES.has(token.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      searchTerm?: string;
      searchType?: string;
      approvalNote?: string;
    };

    const searchTerm = body.searchTerm?.trim() ?? "";
    const searchType = body.searchType?.trim() ?? "VSID";

    const query: Record<string, any> = {
      origin: { $in: [/holidaysera/i, /housingsaga/i] },
      approvalStatus: "pending",
    };

    if (searchTerm) {
      query[searchType] = new RegExp(searchTerm, "i");
    }

    const approvedBy = token.email ?? token.name ?? "System";
    const approvedAt = new Date();
    const approvalNote = body.approvalNote?.trim() ?? "";

    const result = await Properties.updateMany(query, {
      $set: {
        approvalStatus: "approved",
        approvalNote,
        approvedBy,
        approvedAt,
      },
    });

    return NextResponse.json({
      message: "Pending Holidaysera/HousingSaga properties approved",
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch (error: any) {
    console.error("Failed to approve all Holidaysera properties:", error);
    return NextResponse.json(
      { message: "Failed to approve all properties", error: error.message },
      { status: 500 }
    );
  }
}
