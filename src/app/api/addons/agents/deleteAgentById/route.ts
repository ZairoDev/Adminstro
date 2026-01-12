import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Agents from "@/models/agent";

connectDb();

export async function DELETE(req: NextRequest) {
  try {
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
  } catch (err: any) {
    console.error("Error deleting agent:", err);
    return NextResponse.json(
      { error: err.message || "Unable to delete agent" },
      { status: 500 }
    );
  }
}
