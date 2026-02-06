import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Roles from "@/models/role";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
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
        { error: "Unauthorized: You don't have permission to delete roles" },
        { status: 403 }
      );
    }

    await connectDb();
    const { roleId } = await req.json();

    if (!roleId)
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );

    const role = await Roles.findByIdAndDelete(roleId);

    if (!role) {
      return NextResponse.json(
        { error: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Role deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to delete role" },
      { status: 401 }
    );
  }
}
