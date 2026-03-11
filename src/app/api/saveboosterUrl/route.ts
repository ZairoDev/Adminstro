import { NextRequest, NextResponse } from "next/server";
import { Boosters } from "@/models/propertyBooster";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  await connectDb();

  try {
    await getDataFromToken(req);
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
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error in saveUrl route:", err);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
