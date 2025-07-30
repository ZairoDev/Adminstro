import { NextRequest, NextResponse } from "next/server";

import Agents from "@/models/agent";

export async function DELETE(req: NextRequest) {
  const { agentId } = await req.json();

  try {
    if (!agentId)
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );

    await Agents.findByIdAndDelete(agentId);

    return NextResponse.json(
      { message: "Agent deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to delete agent" },
      { status: 401 }
    );
  }
}
