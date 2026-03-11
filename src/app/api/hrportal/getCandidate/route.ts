// import { NextRequest, NextResponse } from "next/server";
// import { connectDb } from "@/util/db";
// import Candidate from "@/models/candidate";

// connectDb();

// export async function GET(request: NextRequest) {
//   try {
//     const url = request.nextUrl;
//     const page = parseInt(url.searchParams.get("page") || "1");
//     const search = url.searchParams.get("search") || "";
//     const limit = 11;
//     const skip = (page - 1) * limit;

//     const searchQuery = {
//       status: "waiting",
//       ...(search && {
//         $or: [
//           { email: { $regex: search, $options: "i" } },
//           { name: { $regex: search, $options: "i" } },
//         ],
//       }),
//     };

//     const totalCandidates = await Candidate.countDocuments(searchQuery);
//     const totalPages = Math.ceil(totalCandidates / limit);
//     const candidates = await Candidate.find(searchQuery)
//       .sort({ queueNumber: 1 })
//       .skip(skip)
//       .limit(limit);

//     return NextResponse.json({
//       candidates,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalCandidates,
//         hasMore: page < totalPages,
//       },
//     });
//   } catch (error: any) {
//     console.error("Error fetching candidates:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

connectDb();

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const url = request.nextUrl;
    const page = parseInt(url.searchParams.get("page") || "1");
    const search = url.searchParams.get("search") || "";
    const limit = 11;
    const skip = (page - 1) * limit;

    const searchQuery = {
      status: "waiting",
      ...(search && {
        $or: [
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const totalCandidates = await Candidate.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCandidates / limit);
    const candidates = await Candidate.find(searchQuery)
      .sort({ queueNumber: 1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      candidates,
      pagination: {
        currentPage: page,
        totalPages,
        totalCandidates,
        hasMore: page < totalPages,
      },
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error fetching candidates:", err);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
