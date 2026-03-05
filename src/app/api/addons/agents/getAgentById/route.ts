import { NextRequest, NextResponse } from "next/server";

import Agents from "@/models/agent";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { agentId } = await req.json();
    if (!agentId)
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );

    const agent = await Agents.findById(agentId);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ data: agent }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    return NextResponse.json(
      { error: "Unable to fetch agent" },
      { status: 500 }
    );
  }
}
