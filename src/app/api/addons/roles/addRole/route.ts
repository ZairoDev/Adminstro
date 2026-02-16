import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Role from "@/models/role";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body is required" },
        { status: 400 }
      );
    }

    const roleStr = String(body.role ?? "").trim();
    const departmentStr = String(body.department ?? "").trim();
    const isActive = body.isActive !== false;
    const originStr = String(body.origin ?? "").trim();

    if (!roleStr) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      );
    }
    if (!departmentStr) {
      return NextResponse.json(
        { error: "Department is required" },
        { status: 400 }
      );
    }

    // Uniqueness: same role + department + origin = duplicate. Same role + department with different origin = allowed.
    const existing = await Role.findOne({
      role: roleStr,
      department: departmentStr,
      origin: originStr,
    });
    if (existing) {
      return NextResponse.json(
        { error: "A role with this name, department and origin already exists" },
        { status: 400 }
      );
    }

    const newRole = await Role.create({
      role: roleStr,
      department: departmentStr,
      isActive,
      origin: originStr,
    });

    return NextResponse.json(
      { message: "Role created successfully", data: newRole },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Error creating role:", err);
    const message =
      err instanceof Error ? err.message : "Unable to create role";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
