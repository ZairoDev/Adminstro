import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  getPilotRoles,
  isCrmAgentEnabled,
  isPilotRole,
} from "@/services/crm-agent/config";

export const dynamic = "force-dynamic";

/** Lightweight status for the chat drawer (enabled + pilot membership). */
export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role ?? "");
    const enabled = isCrmAgentEnabled() && isPilotRole(role);
    return NextResponse.json({
      enabled,
      role,
      pilotRoles: getPilotRoles(),
      flag: process.env.CRM_AGENT_ENABLED === "true",
    });
  } catch {
    return NextResponse.json({ enabled: false }, { status: 401 });
  }
}
