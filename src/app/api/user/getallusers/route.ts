import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

interface User {
  _id: string;
  name: string;
  email: string;
}

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
  } else {
    console.log("Invalid queryType");
  }

  const skip = (currentPage - 1) * 20;

  try {
    const allUsers: User[] = await Users.find(query)
      .limit(20)
      .skip(skip)
      .sort({ _id: -1 });

    const totalUsers: number = await Users.countDocuments(query);

    return NextResponse.json({ allUsers, totalUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({
      message: "Failed to fetch users",
    });
  }
}

// TODO Above code is working fine
