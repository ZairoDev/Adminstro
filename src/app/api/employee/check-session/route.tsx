import { getDataFromToken } from "@/util/getDataFromToken";
import { buildAuthErrorResponse } from "@/util/authErrorResponse";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    const code = err?.code || "AUTH_FAILED";
    const status = err?.status || 401;

    return buildAuthErrorResponse({ status, code });
  }
}
