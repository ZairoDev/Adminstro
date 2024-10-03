import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";
import { error } from "console";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { title, content, tags, maintext, banner, author } = await req.json();

    if (!title || !content || !maintext || !banner || !author) {
      return NextResponse.json(
        { success: false, message: `Some things are missing ${error}` },
        { status: 400 }
      );
    }

    const newBlog = new Blog({
      title,
      content,
      tags,
      maintext,
      banner,
      author,
    });
    await newBlog.save();

    return NextResponse.json(
      { success: true, message: "Blog saved successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
