import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { buildShortTermOwnerJourneyBySheetId } from "@/lib/short-term-owner-journey";

connectDb();

const ALLOWED_ROLES = new Set(["Advert", "SuperAdmin"]);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getDataFromToken(req);
    const role = String((token as { role?: string }).role ?? "");
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const journey = await buildShortTermOwnerJourneyBySheetId(params.id);
    if (!journey) {
      return NextResponse.json(
        { error: "Owner sheet row not found" },
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
