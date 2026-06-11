import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";

connectDb();

const ALLOWED_ROLES = new Set(["Advert", "SuperAdmin"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getDataFromToken(req);
    const role = String((token as { role?: string }).role ?? "");
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ownerUserId, email } = await req.json();
    if (!ownerUserId) {
      return NextResponse.json({ error: "ownerUserId is required" }, { status: 400 });
    }

    const update: Record<string, string> = { ownerUserId: String(ownerUserId) };
    if (email) update.email = String(email).trim();

    const data = await unregisteredOwnerShortTerm.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true },
    );

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Failed to link owner" },
      { status: err?.status ?? 500 },
    );
  }
}
