// pages/api/blog/readblog.ts
import { NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: Request) {
  const { id } = await req.json(); // Get the ID from the request body

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: blog }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
