import Aliases from "@/models/alias";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { searchParams } = new URL(req.url);
    const aliasEmail = searchParams.get("aliasEmail");

    await Aliases.findOneAndDelete({ aliasEmail });

    return NextResponse.json({ message: "Alias delete successfully" }, { status: 200 });
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
