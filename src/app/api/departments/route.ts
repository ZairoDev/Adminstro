import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectDb } from "@/util/db";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";
import { requireDepartmentManager } from "@/lib/departments/auth";
import { findDepartmentByName } from "@/lib/departments/jobIdentity";
import { createDepartmentSchema } from "@/schemas/department.schema";

export const dynamic = "force-dynamic";

type PositionLean = {
  _id: unknown;
  name: string;
  departmentId: unknown;
  isActive: boolean;
};

type DepartmentLean = {
  _id: unknown;
  name: string;
  isActive: boolean;
};

function zodMessage(error: ZodError): string {
  return error.issues[0]?.message || "Invalid request";
}

/**
 * GET /api/departments
 * - ?active=1 → public list of active departments and their active positions
 * - otherwise → HR / Admin / SuperAdmin / HAdmin list of every department
 */
export async function GET(request: NextRequest) {
  try {
    await connectDb();
    const activeOnly = request.nextUrl.searchParams.get("active") === "1";

    if (!activeOnly) {
      const auth = await requireDepartmentManager(request);
      if (!auth.ok) return auth.response;
    }

    const departments = (await Department.find(activeOnly ? { isActive: true } : {})
      .sort({ name: 1 })
      .lean()) as DepartmentLean[];

    const departmentIds = departments.map((department) => department._id);
    const positions = (await JobPosition.find(
      activeOnly
        ? { departmentId: { $in: departmentIds }, isActive: true }
        : { departmentId: { $in: departmentIds } },
    )
      .sort({ name: 1 })
      .lean()) as PositionLean[];

    const positionsByDepartment = new Map<string, PositionLean[]>();
    for (const position of positions) {
      const key = String(position.departmentId);
      const list = positionsByDepartment.get(key) ?? [];
      list.push(position);
      positionsByDepartment.set(key, list);
    }

    const data = departments.map((department) => ({
      _id: String(department._id),
      name: department.name,
      isActive: department.isActive,
      positions: (positionsByDepartment.get(String(department._id)) ?? []).map((position) => ({
        _id: String(position._id),
        name: position.name,
        departmentId: String(position.departmentId),
        isActive: position.isActive,
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[departments] GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch departments" },
      { status: 500 },
    );
  }
}

/** POST /api/departments — create a department */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireDepartmentManager(request);
    if (!auth.ok) return auth.response;

    await connectDb();
    const parsed = createDepartmentSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: zodMessage(parsed.error) },
        { status: 400 },
      );
    }

    const existing = await findDepartmentByName(parsed.data.name);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A department with this name already exists" },
        { status: 400 },
      );
    }

    const department = await Department.create({
      name: parsed.data.name,
      isActive: parsed.data.isActive,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          _id: String(department._id),
          name: department.name,
          isActive: department.isActive,
          positions: [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[departments] POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create department" },
      { status: 500 },
    );
  }
}
