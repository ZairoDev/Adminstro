import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can set pricing rules." },
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
    const location = String(body?.location || "All").trim() || "All";
    const enabled = Boolean(body?.enabled);

    const minRaw = body?.min;
    const maxRaw = body?.max;

    const min =
      minRaw === null || minRaw === undefined || String(minRaw).trim() === ""
        ? null
        : Number(minRaw);
    const max =
      maxRaw === null || maxRaw === undefined || String(maxRaw).trim() === ""
        ? null
        : Number(maxRaw);

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }
    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      return NextResponse.json({ error: "min must be a valid number" }, { status: 400 });
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      return NextResponse.json({ error: "max must be a valid number" }, { status: 400 });
    }
    if (min !== null && max !== null && min > max) {
      return NextResponse.json(
        { error: "min cannot be greater than max" },
        { status: 400 },
      );
    }

    const locKey = location === "All" ? "All" : location.toLowerCase();
    const targetPath = location === "All" ? "pricingRules.all" : `pricingRules.byLocation.${locKey}`;

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          [targetPath]: { enabled, min, max },
        },
      },
      { new: true },
    ).select("_id pricingRules name email isActive allotedArea");

    if (!updated) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, employee: updated });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error("pricing-rule PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update pricing rule" },
      { status: 500 },
    );
  }
}

