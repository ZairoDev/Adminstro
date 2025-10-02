import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Property } from "@/models/listing"; // your new properties model
import { Properties } from "@/models/property";

connectDb();

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const deleted = await Properties.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Property not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Property deleted successfully" });
  } catch (error) {
    console.error("Error deleting property:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
