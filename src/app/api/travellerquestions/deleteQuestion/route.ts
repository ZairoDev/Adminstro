import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Question from "@/models/question";
import mongoose from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();
export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { questionId } = await req.json();

    if (!questionId) {
      return NextResponse.json(
        { error: "Question Id is required" },
        { status: 400 }
      );
    }
    const question = await Question.findById(questionId);
    if (!question) {
      return NextResponse.json(
        { error: "Question does not exist" },
        { status: 404 }
      );
    }

    await Question.findByIdAndDelete({
      _id: new mongoose.Types.ObjectId(questionId),
    });
    return NextResponse.json({ success: true }, { status: 200 });
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
