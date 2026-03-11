import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Users from "@/models/user";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
    await connectDb();
    const brokers = await Users.find({ role: "Broker" }).select(
      "name email phone _id"
    );
    const response = NextResponse.json({ data: brokers }, { status: 200 });

    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Unable to fetch brokers" },
      { status: 500 }
    );
  }
}


