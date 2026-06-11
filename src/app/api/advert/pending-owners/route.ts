import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";

connectDb();

const ALLOWED_ROLES = new Set(["Advert", "SuperAdmin"]);

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const role = String((token as { role?: string }).role ?? "");
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = req.nextUrl.searchParams.get("status") ?? "pending";
    const filter =
      status === "all"
        ? {}
        : { advertListingStatus: status };

    const owners = await unregisteredOwnerShortTerm
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({ owners });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Failed to load pending owners" },
      { status: err?.status ?? 500 },
    );
  }
}
