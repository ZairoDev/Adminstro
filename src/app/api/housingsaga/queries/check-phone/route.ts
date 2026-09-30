import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { phoneExistsInHousingSagaQueries } from "@/services/housingsaga/housingSagaQuery";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  phoneNo: z.string().trim().min(7, "Phone number is required"),
});

/** POST /api/housingsaga/queries/check-phone */
export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);

    const body: unknown = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid phone" },
        { status: 400 },
      );
    }

    await connectDb();
    const exists = await phoneExistsInHousingSagaQueries(parsed.data.phoneNo);

    return NextResponse.json({
      success: true,
      exists,
      message: exists
        ? "Phone number already exists"
        : "Phone number is available",
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("[housingsaga/queries/check-phone] failed:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}
