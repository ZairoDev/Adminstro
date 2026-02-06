import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Roles from "@/models/role";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
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
        { error: "Unauthorized: You don't have permission to update roles" },
        { status: 403 }
      );
    }

    await connectDb();
    const { roleId, roleName, isActive } = await req.json();

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    // Check if role exists
    const existingRole = await Roles.findById(roleId);
    if (!existingRole) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    // If roleName is being updated, check for duplicates (excluding current role)
    if (roleName && roleName !== existingRole.roleName) {
      const duplicateRole = await Roles.findOne({
        roleName: roleName,
        _id: { $ne: roleId },
      });
      if (duplicateRole) {
        return NextResponse.json(
          { error: "Role with this name already exists" },
          { status: 400 }
        );
      }
    }

    // Update role
    const updateData: any = {};
    if (roleName !== undefined) updateData.roleName = roleName;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedRole = await Roles.findByIdAndUpdate(
      roleId,
      updateData,
      { new: true }
    );

    return NextResponse.json(
      { message: "Role updated successfully", data: updatedRole },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in updating role: ", err);
    return NextResponse.json(
      { error: err.message || "Unable to update role" },
      { status: 401 }
    );
  }
}
