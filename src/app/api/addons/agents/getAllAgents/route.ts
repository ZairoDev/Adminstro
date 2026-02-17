import { NextResponse } from "next/server";

import Agents from "@/models/agent";

export async function GET() {
  try {
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
  } catch (err) {
    return NextResponse.json({ data: [], error: "Unable to fetch agents" }, { status: 500 });
  }
}
