import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { Area } from "@/models/area";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ areaId: string }> }
) {
  await connectDb();
  try {
    const token = await getDataFromToken(req);
    const role = (token.role as string) ?? "";

    // Keep it strict: only SuperAdmin can toggle area visibility
    if (role !== "SuperAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { areaId } = await params;
    if (!areaId || !/^[a-f\d]{24}$/i.test(areaId)) {
      return NextResponse.json({ error: "Invalid areaId" }, { status: 400 });
    }

    const area = await Area.findById(areaId);
    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    area.isActive = !Boolean(area.isActive);
    await area.save();

    return NextResponse.json(
      { success: true, areaId, isActive: area.isActive },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "Failed to toggle area status" },
      { status: 500 }
    );
  }
}
