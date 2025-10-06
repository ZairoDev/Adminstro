import { NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

// Connect to the database
connectDb();

export async function POST(req: Request) {
  try {
    const { phoneNo } = await req.json();
    if (!phoneNo) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    const existingQuery = await Query.findOne({ phoneNo }).sort({
      createdAt: -1,
    });

    let numberOfDays = 31;
    if (existingQuery) {
      const today = new Date();
      const leadCreatedDate = existingQuery.createdAt;

      numberOfDays = Math.floor(
        (today.getTime() - leadCreatedDate.getTime()) / (24 * 60 * 60 * 1000)
      );
    }

    if (existingQuery && numberOfDays <= 30) {
      return NextResponse.json(
        { success: true, exists: true, message: "Phone number already exists" },
        { status: 200 }
      );
    }

    // if (existingQuery) {
    //   return NextResponse.json(
    //     {
    //       success: true,
    //       exists: true,
    //       message: "Phone number already exists",
    //       data: existingQuery,
    //     },
    //     { status: 200 }
    //   );
    // }

    return NextResponse.json(
      {
        success: true,
        exists: false,
        message: "Phone number is available",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking phone number:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
