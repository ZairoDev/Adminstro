import { NextRequest, NextResponse } from "next/server";

import User from "@/models/user"; // your Mongoose User model
import { connectDb } from "@/util/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();
  try {
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
