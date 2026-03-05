import { NextRequest, NextResponse } from "next/server";

import Agents from "@/models/agent";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(request: NextRequest) {
  try {
    await getDataFromToken(request);
    const agents = await Agents.find();
    const response = NextResponse.json({ data: agents }, { status: 200 });

    // Tell browser/CDN to never cache this response
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    return NextResponse.json({ data: [], error: "Unable to fetch agents" }, { status: 500 });
  }
}
