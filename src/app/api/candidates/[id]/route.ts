
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, string> = {};
    if (body.status) updateData.status = body.status;
    if (body.position) updateData.position = body.position;

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}
