import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Agents from "@/models/agent";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function DELETE(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json(
        { error: "Agent ID is required" },
        { status: 400 }
      );
    }

    const deletedAgent = await Agents.findByIdAndDelete(agentId);

    if (!deletedAgent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Agent deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: err?.message || "Unable to delete agent" },
      { status: 500 }
    );
  }
}
