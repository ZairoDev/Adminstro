import { NextRequest, NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const data = await getDataFromToken(req);
    if (data.role !== "SuperAdmin") {
      return NextResponse.json(
        {
          error: "Unauthorized. Only SuperAdmin can delete blogs.",
        },
        { status: 403 }
      );
    }

    // Parse the blog id from the request body
    const { id } = await req.json();
    console.log(id);

    const _id = id[0];
    console.log(_id);

    // Find and delete the blog by its ID
    const blog = await Blog.findByIdAndDelete(_id);
    if (!blog) {
      return NextResponse.json(
        { success: false, message: "Blog not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Blog deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
