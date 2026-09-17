import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

/**
 * POST /api/employee/session/heartbeat
 * Lightweight keep-alive ping. getDataFromToken validates the session AND
 * refreshes webSession.lastActiveAt (clearing any pending tab-close release),
 * so simply calling it here is the whole job.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await getDataFromToken(request);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    return NextResponse.json(
      { ok: false, code: err?.code ?? "AUTH_FAILED" },
      { status: err?.status ?? 401 },
    );
  }
}
