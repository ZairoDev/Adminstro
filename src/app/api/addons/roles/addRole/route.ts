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
    // Handle isActive: default to true, only set to false if explicitly false
    // This ensures new roles are active by default
    const isActive = body.isActive === false ? false : true;
    const originStr = String(body.origin ?? "").trim();
    
    console.log(`Creating role - received isActive: ${body.isActive} (type: ${typeof body.isActive}), setting to: ${isActive}`);

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
    console.log(`Checking for existing role: role="${roleStr}", department="${departmentStr}", origin="${originStr}"`);
    const existing = await Role.findOne({
      role: roleStr,
      department: departmentStr,
      origin: originStr,
    });
    if (existing) {
      console.log(`Duplicate found:`, existing);
      return NextResponse.json(
        { error: "A role with this name, department and origin already exists" },
        { status: 400 }
      );
    }
    console.log(`No duplicate found, proceeding with creation`);

    console.log(`Creating role with: role="${roleStr}", department="${departmentStr}", origin="${originStr}", isActive=${isActive}`);
    
    const newRole = await Role.create({
      role: roleStr,
      department: departmentStr,
      isActive,
      origin: originStr,
    });

    console.log(`Role created successfully with ID: ${newRole._id}`);
    console.log(`Role data:`, JSON.stringify(newRole.toObject(), null, 2));

    return NextResponse.json(
      { message: "Role created successfully", data: newRole },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Error creating role:", err);
    
    // Check if it's a duplicate key error (MongoDB error code 11000)
    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      const mongoError = err as { code: number; keyPattern?: Record<string, number> };
      const duplicateField = mongoError.keyPattern ? Object.keys(mongoError.keyPattern)[0] : "unknown";
      console.error(`Duplicate key error on field: ${duplicateField}`);
      return NextResponse.json(
        { error: `A role with this ${duplicateField} already exists` },
        { status: 400 }
      );
    }
    
    const message =
      err instanceof Error ? err.message : "Unable to create role";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
