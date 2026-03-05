import Agents from "@/models/agent";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const agentData = await req.json();
    await Agents.create(agentData);

    return NextResponse.json(
      { message: "Agent created successfully" },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.log("error in creating agent: ", error);
    return NextResponse.json({ error: "Unable to create agent" }, { status: 500 });
  }
}
