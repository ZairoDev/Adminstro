import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    const code = err?.code || "AUTH_FAILED";
    const status = err?.status || 401;
    const response = NextResponse.json(
      { success: false, code },
      { status },
    );

    if (code === "AUTH_EXPIRED") {
      response.cookies.set("token", "", {
        httpOnly: true,
        expires: new Date(0),
        path: "/",
      });

      response.cookies.set("sessionId", "", {
        httpOnly: true,
        expires: new Date(0),
        path: "/",
      });
    }

    return response;
  }
}
