import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import Department from "@/models/department";
import { requireDepartmentManager } from "@/lib/departments/auth";
import { findDepartmentByName } from "@/lib/departments/jobIdentity";
import { updateDepartmentSchema } from "@/schemas/department.schema";

export const dynamic = "force-dynamic";

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}

/** PATCH /api/departments/[id] — rename or activate a department */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireDepartmentManager(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Department id is invalid" },
        { status: 400 },
      );
    }

    await connectDb();
    const parsed = updateDepartmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }

    if (parsed.data.name) {
      const existing = await findDepartmentByName(parsed.data.name);
      if (existing && String(existing._id) !== id) {
        return NextResponse.json(
          { success: false, error: "A department with this name already exists" },
          { status: 400 },
        );
      }
    }

    const updated = await Department.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: String(updated._id),
        name: updated.name,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("[departments] PATCH failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update department" },
      { status: 500 },
    );
  }
}
