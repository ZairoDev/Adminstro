import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/question";
import { error } from "console";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: `Some things are missing ${error}` },
        { status: 400 }
      );
    }
    const newQuestion = new Question({
      title,
      content,
    });
    
    await newQuestion.save();
    
    return NextResponse.json(
      { success: true, message: "question saved successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
