import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/question";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { title } = await req.json();
    let questions;
    if (!title) {
      questions = await Question.find();
    } else {
      questions = await Question.find({
        title: { $regex: title, $options: "i" },
      });
    }
    return NextResponse.json({ success: true, questions }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
