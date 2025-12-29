import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch all notes for a candidate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const candidate = await Candidate.findById(id).select("notes");

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Sort notes by newest first
    const sortedNotes = (candidate.notes || []).sort(
      (a: any, b: any) => 
        new Date(b.updatedAt || b.createdAt).getTime() - 
        new Date(a.updatedAt || a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: sortedNotes,
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
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

    const newNote = {
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!candidate.notes) {
      candidate.notes = [];
    }

    candidate.notes.push(newNote);
    await candidate.save();

    // Get the saved note with its _id
    const savedNote = candidate.notes[candidate.notes.length - 1];

    return NextResponse.json({
      success: true,
      data: savedNote,
      message: "Note created successfully",
    });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create note" },
      { status: 500 }
    );
  }
}

