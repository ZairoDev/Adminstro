// // import { NextResponse } from "next/server";
// // import Blog from "@/models/blog";
// // import { connectDb } from "@/util/db";

// // connectDb();

// // export async function GET() {
// //   try {
// //     const blogs = await Blog.find();
// //     return NextResponse.json({ success: true, data: blogs }, { status: 200 });
// //   } catch (error: any) {
// //     return NextResponse.json(
// //       { success: false, message: error.message },
// //       { status: 500 }
// //     );
// //   }
// // }

// import { NextResponse } from "next/server";
// import Blog from "@/models/blog";
// import { connectDb } from "@/util/db";

// connectDb();

// export async function GET(req: Request) {
//   const { search } = Object.fromEntries(new URL(req.url).searchParams); // Extract the search query

//   try {
//     let blogs;
//     if (search) {
//       // If a search term is provided, filter blogs based on tags
//       blogs = await Blog.find({ tags: { $regex: search, $options: "i" } });
//     } else {
//       // If no search term, return all blogs
//       blogs = await Blog.find();
//     }

//     return NextResponse.json({ success: true, data: blogs }, { status: 200 });
//   } catch (error: any) {
//     return NextResponse.json(
//       { success: false, message: error.message },
//       { status: 500 }
//     );
//   }
// }

import { NextResponse } from "next/server";
import Blog from "@/models/blog";
import { connectDb } from "@/util/db";

connectDb();

export async function GET(req: Request) {
  const {
    search,
    page = 1,
    limit = 10,
  } = Object.fromEntries(new URL(req.url).searchParams);
  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);

  try {
    let query = {};
    if (search) {
      query = { tags: { $regex: search, $options: "i" } };
    }

    const blogs = await Blog.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalBlogs = await Blog.countDocuments(query); // Total blog count for pagination

    return NextResponse.json(
      {
        success: true,
        data: blogs,
        total: totalBlogs,
        currentPage: pageNumber,
        totalPages: Math.ceil(totalBlogs / limitNumber),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
