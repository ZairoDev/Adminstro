import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/question";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { questionId } = await req.json();
    if (!questionId) {
      return NextResponse.json(
        { error: "Question ID is required" },
        { status: 400 }
      );
    }
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: "Question doesn't exist" },
        { status: 404 }
      );
    }
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
