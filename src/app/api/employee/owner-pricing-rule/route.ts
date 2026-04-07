import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can set owner pricing rules." },
      { status: 403 },
    );
  }
  return null;
}

const bodySchema = z.object({
  employeeId: z.string().min(1),
  location: z.string().optional().default("All"),
  enabled: z.coerce.boolean().optional().default(false),
  min: z.union([z.number(), z.null()]).optional(),
  max: z.union([z.number(), z.null()]).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const deny = ensureHrOrSuperAdmin((token as { role?: unknown })?.role);
    if (deny) return deny;

    await connectDb();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const employeeId = parsed.data.employeeId.trim();
    const location = String(parsed.data.location || "All").trim() || "All";
    const enabled = Boolean(parsed.data.enabled);

    const minRaw = parsed.data.min;
    const maxRaw = parsed.data.max;
    const min = minRaw === undefined ? null : minRaw;
    const max = maxRaw === undefined ? null : maxRaw;

    if (min !== null && (!Number.isFinite(min) || min < 0)) {
      return NextResponse.json({ error: "min must be a valid number" }, { status: 400 });
    }
    if (max !== null && (!Number.isFinite(max) || max < 0)) {
      return NextResponse.json({ error: "max must be a valid number" }, { status: 400 });
    }
    if (min !== null && max !== null && min > max) {
      return NextResponse.json({ error: "min cannot be greater than max" }, { status: 400 });
    }

    const locKey = location === "All" ? "All" : location.toLowerCase();
    const targetPath =
      location === "All" ? "ownerPricingRules.all" : `ownerPricingRules.byLocation.${locKey}`;

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { [targetPath]: { enabled, min, max } } },
      { new: true },
    ).select("_id ownerPricingRules name email isActive allotedArea");

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
    console.error("owner-pricing-rule PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update owner pricing rule" },
      { status: 500 },
    );
  }
}

