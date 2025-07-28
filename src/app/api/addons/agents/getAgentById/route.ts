import { NextRequest, NextResponse } from "next/server";

import Agents from "@/models/agent";

export async function POST(req: NextRequest) {
  const { agentId } = await req.json();

  try {
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
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to fetch agent" },
      { status: 401 }
    );
  }
}
