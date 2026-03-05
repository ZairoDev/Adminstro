import { NextRequest, NextResponse } from "next/server";
import User from "@/models/user"; // your Mongoose User model
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    // Authorize (only SuperAdmin, Admin, HR can delete users)
    const allowedRoles = ["SuperAdmin", "Admin", "HR", "HAdmin"];
    if (!auth?.role || !allowedRoles.includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "User deleted successfully", user: deletedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
