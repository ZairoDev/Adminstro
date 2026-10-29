import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";
import { requireDepartmentManager } from "@/lib/departments/auth";
import { findJobPositionByName } from "@/lib/departments/jobIdentity";
import { createJobPositionSchema } from "@/schemas/department.schema";

export const dynamic = "force-dynamic";

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}

/** POST /api/departments/[id]/positions — add a job position inside a department */
export async function POST(
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
    const department = await Department.findById(id).select("_id").lean();
    if (!department) {
      return NextResponse.json(
        { success: false, error: "Department not found" },
        { status: 404 },
      );
    }

    const parsed = createJobPositionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }

    const existing = await findJobPositionByName(department._id, parsed.data.name);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "This job position already exists in the department" },
        { status: 400 },
      );
    }

    const position = await JobPosition.create({
      name: parsed.data.name,
      departmentId: department._id,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: String(position._id),
          name: position.name,
          departmentId: String(position.departmentId),
          isActive: position.isActive,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[departments] create position failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create job position" },
      { status: 500 },
    );
  }
}
