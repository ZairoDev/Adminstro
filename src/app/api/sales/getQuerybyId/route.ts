import { NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID is required" },
        { status: 400 }
      );
    }
    const query = await Query.findById(id);
    if (!query) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: query }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
