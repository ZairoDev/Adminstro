import { NextRequest, NextResponse } from "next/server";
import Question from "@/models/question";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
connectDb();
export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json(
        { success: false, message: "Some things are missing" },
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
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
