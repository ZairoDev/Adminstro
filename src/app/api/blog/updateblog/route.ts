import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { id, title, content, tags, maintext, banner } = await req.json();

    const _id = id;

    // console.log(_id, title, content, tags, maintext, banner, "Above call");

    if (!_id || !title || !content || !maintext || !banner) {
      return NextResponse.json(
        { success: false, message: "Missing required fields or ID" },
        { status: 400 }
      );
    }
    // console.log(
    //   _id,
    //   title,
    //   content,
    //   tags,
    //   maintext,   
    //   banner,

    //   "Below call"
    // );

    



    const existingBlog = await Blog.findById(_id);
    if (!existingBlog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    existingBlog.title = title;
    existingBlog.content = content;
    existingBlog.tags = tags;
    existingBlog.maintext = maintext;
    existingBlog.banner = banner;

    await existingBlog.save();

    return NextResponse.json(
      { success: true, message: "Blog updated successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 400 }
    );
  }
}
