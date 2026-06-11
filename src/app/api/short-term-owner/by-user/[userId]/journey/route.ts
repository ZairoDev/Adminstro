import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { buildShortTermOwnerJourneyByUserId } from "@/lib/short-term-owner-journey";

connectDb();

const ALLOWED_ROLES = new Set(["Advert", "SuperAdmin"]);

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const token = await getDataFromToken(req);
    const role = String((token as { role?: string }).role ?? "");
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const journey = await buildShortTermOwnerJourneyByUserId(params.userId);
    if (!journey) {
      return NextResponse.json(
        { error: "No short-term sheet row linked to this owner" },
        { status: 404 },
      );
    }

    return NextResponse.json(journey);
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Failed to load journey" },
      { status: err?.status ?? 500 },
    );
  }
}
