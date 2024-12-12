import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/question";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { questionId, title, content } = await req.json();

    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }

    if (!title || !content) {
      return NextResponse.json(
        { error: "Both title and content are required." },
        { status: 400 }
      );
    }

    // Find the question by ID and update it
    const question = await Question.findByIdAndUpdate(
      questionId,
      { title, content },
      { new: true }
    );

    if (!question) {
      return NextResponse.json(
        { error: "Question doesn't exist" },
        { status: 404 }
      );
    }

    // Return the updated question data
    return NextResponse.json(
      { success: true, data: question },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
