import Agents from "@/models/agent";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const agentData = await req.json();

  try {
    await Agents.create(agentData);

    return NextResponse.json(
      { message: "Agent created successfully" },
      { status: 201 }
    );
  } catch (err) {
    console.log("error in creating agent: ", err);
    return NextResponse.json({ status: 401, error: "Unable to create agent" });
  }
}
