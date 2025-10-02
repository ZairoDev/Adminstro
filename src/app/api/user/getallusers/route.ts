import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

interface UserQuery {
  [key: string]: RegExp;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const currentPage =
    Number(request.nextUrl.searchParams.get("currentPage")) || 1;
  const queryType = request.nextUrl.searchParams.get("queryType");
  let userInput = request.nextUrl.searchParams.get("userInput");

  if (userInput) {
    userInput = userInput.trim();
  }

  const query: UserQuery = {};
  const validQueryTypes = ["name", "email", "phone"];

  if (queryType && validQueryTypes.includes(queryType)) {
    if (userInput) {
      const regex = new RegExp(userInput, "i");
      query[queryType] = regex;
    }
  }

  const skip = (currentPage - 1) * 20;

  try {
    const allUsers = await Users.aggregate([
      { $match: query },

      // Lookup from properties (first source)
      {
        $lookup: {
          from: "properties",
          let: { userIdStr: { $toString: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userIdStr"] } } },
            { $project: { _id: 1, VSID: 1 } }, // keep both
          ],
          as: "vsids",
        },
      },

      // Lookup from listings (old vsid)
      {
        $lookup: {
          from: "listings",
          let: { userIdStr: { $toString: "$_id" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userIdStr"] } } },
            { $project: { _id: 1, VSID: 1 } },
          ],
          as: "vsids2",
        },
      },

      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: 20 },
    ]);
    console.log("Fetched users with VSIDs:", allUsers);
    const totalUsers = await Users.countDocuments(query);

    return NextResponse.json({ allUsers, totalUsers });
  } catch (error) {
    console.error("Error fetching users with VSIDs:", error);
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
