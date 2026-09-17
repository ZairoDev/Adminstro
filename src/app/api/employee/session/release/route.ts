import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic";

type TokenPayload = { id?: string; sid?: string };

/**
 * POST /api/employee/session/release
 *
 * Target of the navigator.sendBeacon() fired on tab close/unload. It only
 * MARKS the web session as pending-release (sets pendingReleaseAt); it does NOT
 * invalidate the session. This is deliberate: a page refresh also fires the
 * beacon, but the reloaded page's heartbeat clears pendingReleaseAt within
 * seconds, so a refresh never logs the user out. A genuine close leaves
 * pendingReleaseAt set, and the web-session sweeper (or the next login attempt)
 * releases it after the short grace window.
 *
 * Always returns 200 — beacons ignore the response and must never error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const token =
      request.cookies.get("token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ ok: true });

    let decoded: TokenPayload | null = null;
    try {
      decoded = jwt.verify(token, process.env.TOKEN_SECRET as string) as TokenPayload;
    } catch {
      decoded = jwt.decode(token) as TokenPayload | null;
    }

    const employeeId = decoded?.id;
    const sessionId = decoded?.sid || request.cookies.get("sessionId")?.value || null;

    if (!employeeId || employeeId === "test-superadmin") {
      return NextResponse.json({ ok: true });
    }

    await connectDb();
    await Employees.updateOne(
      {
        _id: employeeId,
        ...(sessionId ? { "webSession.sessionId": sessionId } : {}),
      },
      { $set: { "webSession.pendingReleaseAt": Date.now() } },
    ).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
