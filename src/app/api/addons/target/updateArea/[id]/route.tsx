import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Area } from "@/models/area"; 

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();

  try {
    const body = await req.json();
    const { area } = body;

    if (!area || !params.id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find area by ID
    const updated = await Area.findByIdAndUpdate(params.id, area, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Area updated successfully", data: updated },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error updating area:", err);
    return NextResponse.json(
      { error: "Failed to update area" },
      { status: 500 }
    );
  }
}
