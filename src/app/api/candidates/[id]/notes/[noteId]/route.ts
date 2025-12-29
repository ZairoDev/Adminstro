import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

// PUT - Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  await connectDb();

  try {
    const { id, noteId } = await params;
    const { content } = await request.json();

    if (!content || content.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Note content is required" },
        { status: 400 }
      );
    }

    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const note = candidate.notes?.id(noteId);

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    note.content = content.trim();
    note.updatedAt = new Date();
    await candidate.save();

    return NextResponse.json({
      success: true,
      data: note,
      message: "Note updated successfully",
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  await connectDb();

  try {
    const { id, noteId } = await params;

    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const note = candidate.notes?.id(noteId);

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    candidate.notes = candidate.notes?.filter(
      (n) => n._id?.toString() !== noteId
    );
    await candidate.save();

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete note" },
      { status: 500 }
    );
  }
}

