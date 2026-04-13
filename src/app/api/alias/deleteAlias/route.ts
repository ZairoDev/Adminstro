import Aliases from "@/models/alias";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();
    const { searchParams } = new URL(req.url);
    const aliasEmail = searchParams.get("aliasEmail")?.trim();

    if (!aliasEmail) {
      return NextResponse.json({ error: "aliasEmail is required" }, { status: 400 });
    }

    const deletedAlias = await Aliases.findOneAndDelete({ aliasEmail });
    if (!deletedAlias) {
      return NextResponse.json({ error: "Alias not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Alias deleted successfully" }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
