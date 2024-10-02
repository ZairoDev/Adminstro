import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { title, content, tags, maintext, banner } = await req.json();

    console.log(title, content, tags, maintext, banner);

    if (!title || !content || !maintext || !banner) {
      return NextResponse.json(
        { success: false, message: "Title and content are required" },
        { status: 400 }
      );
    }

    const newBlog = new Blog({ title, content, tags, maintext, banner });
    await newBlog.save();

    return NextResponse.json(
      { success: true, message: "Blog saved successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
