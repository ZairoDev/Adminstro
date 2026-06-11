import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Users from "@/models/user";
import { resolveShortTermDraft } from "@/lib/resolve-short-term-draft";

connectDb();

const ALLOWED_ROLES = new Set(["Advert", "SuperAdmin", "Admin"]);

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

    const user = await Users.findById(params.userId).select("email phone").lean();
    const email = String((user as { email?: string } | null)?.email ?? "");
    const phone = String((user as { phone?: string } | null)?.phone ?? "");

    const resolved = await resolveShortTermDraft({
      userId: params.userId,
      ownerEmail: email,
      ownerPhone: phone,
    });

    return NextResponse.json({
      shortTermDraft: resolved.shortTermDraft,
      ownerSheetId: resolved.ownerSheetId || null,
      ownerSheet: resolved.sheetRow,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    return NextResponse.json(
      { error: err?.message ?? "Failed to resolve owner sheet" },
      { status: err?.status ?? 500 },
    );
  }
}
