import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import CrmAgentAudit from "@/models/crmAgentAudit";
import { isCrmAgentEnabled } from "@/services/crm-agent/config";

export const dynamic = "force-dynamic";

/** SuperAdmin-only audit export for CRM Copilot turns. */
export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role ?? "");
    if (!isCrmAgentEnabled()) {
      return NextResponse.json(
        { error: "CRM Copilot is disabled" },
        { status: 403 },
      );
    }
    if (role !== "SuperAdmin" && role !== "Developer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") || 50)),
    );
    const logs = await CrmAgentAudit.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "actorId role question intent chunkIds toolCalls latencyMs refused refuseReason createdAt",
      )
      .lean();

    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status === 401 || error?.code) {
      return NextResponse.json(
        { error: error.message || "Unauthorized", code: error.code },
        { status: error.status || 401 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load audits" },
      { status: 500 },
    );
  }
}
