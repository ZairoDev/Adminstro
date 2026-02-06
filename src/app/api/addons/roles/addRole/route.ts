import Roles from "@/models/role";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Check authorization
    const token = await getDataFromToken(req);
    if (!token || typeof token !== "object" || !("role" in token)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 403 }
      );
    }

    const userRole = String(token.role);
    const allowedRoles = ["SuperAdmin", "HR"];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorized: You don't have permission to create roles" },
        { status: 403 }
      );
    }

    await connectDb();
    const roleData = await req.json();

    // Check if role with same name already exists
    const existingRole = await Roles.findOne({
      roleName: roleData.roleName,
    });
    if (existingRole) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 400 }
      );
    }

    const role = await Roles.create({
      roleName: roleData.roleName,
      isActive: roleData.isActive ?? true,
    });

    return NextResponse.json(
      { message: "Role created successfully", data: role },
      { status: 201 }
    );
  } catch (err: any) {
    console.log("error in creating role: ", err);
    return NextResponse.json(
      { error: err.message || "Unable to create role" },
      { status: 401 }
    );
  }
}
