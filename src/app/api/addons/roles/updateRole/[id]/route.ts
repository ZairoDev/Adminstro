import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Role from "@/models/role";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }
    await connectDb();
    const body = await req.json();
    const { role, department, isActive, origin } = body;

    if (!role?.trim()) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }
    if (!department?.trim()) {
      return NextResponse.json(
        { error: "Department is required" },
        { status: 400 }
      );
    }

    const roleStr = String(role ?? "").trim();
    const departmentStr = String(department ?? "").trim();
    const originStr = String(origin ?? "").trim();

    // Uniqueness: same role + department + origin = duplicate (when origin is same). Different origin = allowed.
    const existing = await Role.findOne({
      role: roleStr,
      department: departmentStr,
      origin: originStr,
      _id: { $ne: id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Another role with this name, department and origin already exists" },
        { status: 400 }
      );
    }

    const updated = await Role.findByIdAndUpdate(
      id,
      {
        role: roleStr,
        department: departmentStr,
        isActive: isActive !== false,
        origin: originStr,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Role updated successfully", data: updated },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("Error updating role:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to update role" },
      { status: 500 }
    );
  }
}
