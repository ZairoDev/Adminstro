import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/question";
import { connectDb } from "@/util/db";

connectDb();

export async function GET(req: NextRequest) {
  try {
    // Fetch all questions from the database
    const questions = await Question.find();

    return NextResponse.json(
      { success: true, questions },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
