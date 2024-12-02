import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";
import { error } from "console";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const data = await getDataFromToken(req);
    if (!data) {
      return NextResponse.json(
        { success: false, message: `Unauthorized` },
        { status: 401 }
      );
    }
    if (!(data.role === "Content" || data.role === "SuperAdmin")) {
      return NextResponse.json(
        { success: false, message: `Unauthorized` },
        { status: 401 }
      );
    }
    const { title, content, tags, maintext, banner, author, wordCount } =
      await req.json();
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
      totalWords: wordCount,
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
