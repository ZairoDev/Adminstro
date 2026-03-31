import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { buildAuthErrorResponse } from "@/util/authErrorResponse";
import EmployeeUiRule from "@/models/employeeUiRule";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic";

const REMOVED_RULE_NAMES = ["Hide Guest Management", "Hide Owner Management"] as const;

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can manage rules." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const deny = ensureHrOrSuperAdmin((token as any)?.role);
    if (deny) return deny;

    await connectDb();
    // Cleanup: remove the two deprecated rules and unassign from employees
    const removed = await EmployeeUiRule.find({ name: { $in: [...REMOVED_RULE_NAMES] } })
      .select("_id")
      .lean();
    const removedIds = removed.map((r: any) => String(r._id)).filter(Boolean);
    if (removedIds.length > 0) {
      await Employees.updateMany(
        { uiRuleIds: { $in: removedIds } },
        { $pull: { uiRuleIds: { $in: removedIds } } },
      );
      await EmployeeUiRule.deleteMany({ _id: { $in: removedIds } });
    }

    const rules = await EmployeeUiRule.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, rules });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    const status = err?.status || 401;
    const code = err?.code || "AUTH_FAILED";
    return buildAuthErrorResponse({ status, code });
  }
}

export async function POST(request: NextRequest) {
  // Rules are predefined (no custom creation)
  return NextResponse.json(
    { error: "Rules are predefined and cannot be created." },
    { status: 403 },
  );
}

