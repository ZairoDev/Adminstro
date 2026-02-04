import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

const PAGE_SIZE = 20;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const search = (searchParams.get("search") || "").trim();
    const skip = (page - 1) * PAGE_SIZE;

    const query: any = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const [users, total] = await Promise.all([
      Users.aggregate([
        { $match: query },
        { $sort: { _id: -1 } },
        { $skip: skip },
        { $limit: PAGE_SIZE },
        {
          $lookup: {
            from: "properties",
            let: { uid: { $toString: "$_id" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
              { $project: { VSID: 1 } },
            ],
            as: "vsids",
          },
        },
        {
          $lookup: {
            from: "listings",
            let: { uid: { $toString: "$_id" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
              { $project: { VSID: 1 } },
            ],
            as: "vsids2",
          },
        },
      ]),
      Users.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      users,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    });
  } catch (error) {
    console.error("getallusers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
