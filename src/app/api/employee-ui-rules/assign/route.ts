import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { buildAuthErrorResponse } from "@/util/authErrorResponse";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can assign rules." },
      { status: 403 },
    );
  }
  return null;
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const deny = ensureHrOrSuperAdmin((token as any)?.role);
    if (deny) return deny;

    await connectDb();
    const body = await request.json();
    const employeeId = String(body?.employeeId || "").trim();
    const uiRuleIdsRaw = Array.isArray(body?.uiRuleIds) ? body.uiRuleIds : [];
    const uiRuleIds = Array.from(
      new Set(uiRuleIdsRaw.map((x: any) => String(x).trim()).filter(Boolean)),
    );

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { uiRuleIds } },
      { new: true },
    ).select("_id uiRuleIds");

    if (!updated) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    const status = err?.status || 401;
    const code = err?.code || "AUTH_FAILED";
    return buildAuthErrorResponse({ status, code });
  }
}

