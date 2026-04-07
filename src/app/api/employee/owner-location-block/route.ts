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
      { error: "Unauthorized. Only HR/SuperAdmin can set owner location blocks." },
      { status: 403 },
    );
  }
  return null;
}

const bodySchema = z.object({
  employeeId: z.string().min(1),
  blockedLocations: z.array(z.string()).optional().default([]),
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
    const blockedLocations = Array.from(
      new Set(
        (parsed.data.blockedLocations || [])
          .map((x) => String(x).trim())
          .filter(Boolean)
          .map((x) => x.toLowerCase()),
      ),
    );

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      { $set: { "ownerLocationBlock.all": blockedLocations } },
      { new: true },
    ).select("_id ownerLocationBlock name email isActive allotedArea");

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
    console.error("owner-location-block PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update owner location blocks" },
      { status: 500 },
    );
  }
}

