import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { MonthlyTarget } from "@/models/monthlytarget";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ targetId: string }> }
) {
  await connectDb();
  try {
    const token = await getDataFromToken(req);
    const role = (token.role as string) ?? "";

    if (role !== "SuperAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { targetId } = await params;
    if (!targetId || !/^[a-f\d]{24}$/i.test(targetId)) {
      return NextResponse.json({ error: "Invalid targetId" }, { status: 400 });
    }

    const target = await MonthlyTarget.findById(targetId);
    if (!target) {
      return NextResponse.json({ error: "City target not found" }, { status: 404 });
    }

    target.isActive = !Boolean(target.isActive);
    await target.save();

    return NextResponse.json(
      { success: true, targetId, isActive: target.isActive },
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
      { error: "Failed to toggle city status" },
      { status: 500 }
    );
  }
}

