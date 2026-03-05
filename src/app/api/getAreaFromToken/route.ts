import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    return NextResponse.json({ area: token.allotedArea });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    return NextResponse.json(
      { code: err?.code || "AUTH_FAILED" },
      { status: err?.status || 401 }
    );
  }
}
