import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import JobPosition from "@/models/jobPosition";
import { requireDepartmentManager } from "@/lib/departments/auth";
import { findJobPositionByName } from "@/lib/departments/jobIdentity";
import { updateJobPositionSchema } from "@/schemas/department.schema";

export const dynamic = "force-dynamic";

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}

/** PATCH /api/departments/[id]/positions/[positionId] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; positionId: string }> },
) {
  try {
    const auth = await requireDepartmentManager(request);
    if (!auth.ok) return auth.response;

    const { id, positionId } = await params;
    if (
      !id ||
      !positionId ||
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(positionId)
    ) {
      return NextResponse.json(
        { success: false, error: "Department or job position id is invalid" },
        { status: 400 },
      );
    }

    await connectDb();
    const parsed = updateJobPositionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }

    const current = await JobPosition.findOne({
      _id: positionId,
      departmentId: id,
    }).lean();
    if (!current) {
      return NextResponse.json(
        { success: false, error: "Job position not found in this department" },
        { status: 404 },
      );
    }

    if (parsed.data.name) {
      const existing = await findJobPositionByName(current.departmentId, parsed.data.name);
      if (existing && String(existing._id) !== positionId) {
        return NextResponse.json(
          { success: false, error: "This job position already exists in the department" },
          { status: 400 },
        );
      }
    }

    const updated = await JobPosition.findByIdAndUpdate(
      positionId,
      { $set: parsed.data },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Job position not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: String(updated._id),
        name: updated.name,
        departmentId: String(updated.departmentId),
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("[departments] update position failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update job position" },
      { status: 500 },
    );
  }
}
