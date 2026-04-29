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
      propertyId?: string;
      commonId?: string;
      approvalNote?: string;
    };

    const { propertyId, commonId, approvalNote } = body;
    if (!propertyId && !commonId) {
      return NextResponse.json(
        { message: "propertyId or commonId is required" },
        { status: 400 }
      );
    }

    const filter = propertyId ? { _id: propertyId } : { commonId };

    const updatedProperty = await Properties.findOneAndUpdate(
      {
        ...filter,
        origin: { $in: [/holidaysera/i, /housingsaga/i] },
        approvalStatus: "pending",
      },
      {
        $set: {
          approvalStatus: "approved",
          approvalNote: approvalNote?.trim() ?? "",
          approvedBy: token.email ?? token.name ?? "System",
          approvedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    if (!updatedProperty) {
      return NextResponse.json(
        {
          message:
            "Pending Holidaysera/HousingSaga property not found or already handled",
        },
        { status: 404 }
      );
    }

    const normalizedProperty = updatedProperty as Record<string, unknown>;

    return NextResponse.json({
      message: "Property approved successfully",
      data: {
        ...normalizedProperty,
        effectiveApprovalStatus:
          (normalizedProperty.approvalStatus as string | undefined) ?? "approved",
      },
    });
  } catch (error: any) {
    console.error("Failed to approve Holidaysera property:", error);
    return NextResponse.json(
      { message: "Failed to approve property", error: error.message },
      { status: 500 }
    );
  }
}
