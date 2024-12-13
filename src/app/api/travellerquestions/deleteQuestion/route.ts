import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Question from "@/models/question";
import mongoose from "mongoose";

connectDb();
export async function POST(req: NextRequest) {
  const { questionId } = await req.json();
  try {
    if (!questionId) {
      return NextResponse.json(
        { error: "Question Id is required" },
        { status: 401 }
      );
    }
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: "Question does not exit" },
        { status: 401 }
      );
    }

    await Question.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(questionId),
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
