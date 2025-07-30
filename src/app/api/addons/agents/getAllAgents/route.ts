import { NextResponse } from "next/server";

import Agents from "@/models/agent";

export async function GET() {
  try {
    const agents = await Agents.find({}, { agentName: 1, agentPhone: 1 });

    return NextResponse.json({ data: agents }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ status: 401, error: "Unable to fetch agents" });
  }
}
