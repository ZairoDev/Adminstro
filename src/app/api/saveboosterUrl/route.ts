import { NextResponse } from "next/server";
import { Boosters } from "@/models/propertyBooster"; // adjust import path
import { connectDb } from "@/util/db";

export async function POST(req: Request) {
  await connectDb();

  try {
    const { id, url } = await req.json();

    if (!id || !url) {
      return NextResponse.json(
        { error: "Both id and url are required" },
        { status: 400 }
      );
    }

    const updated = await Boosters.findByIdAndUpdate(
      id,
      { url },
      { new: true } // return updated doc
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "URL saved successfully",
      data: updated,
    });
  } catch (err: any) {
    console.error("Error in saveUrl route:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
