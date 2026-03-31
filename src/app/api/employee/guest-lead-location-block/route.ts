import { NextRequest, NextResponse } from "next/server";

import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can set lead location blocks." },
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
    const blockedRaw = Array.isArray(body?.blockedLocations) ? body.blockedLocations : [];

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const blockedLocations = Array.from(
      new Set(
        blockedRaw
          .map((x: any) => String(x).trim())
          .filter(Boolean)
          .map((x: string) => x.toLowerCase()),
      ),
    );

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { "guestLeadLocationBlock.all": blockedLocations } },
      { new: true },
    ).select("_id guestLeadLocationBlock name email isActive allotedArea");

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
    console.error("guest-lead-location-block PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update lead location blocks" },
      { status: 500 },
    );
  }
}

