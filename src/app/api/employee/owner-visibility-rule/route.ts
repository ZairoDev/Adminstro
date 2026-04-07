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
      { error: "Unauthorized. Only HR/SuperAdmin can set owner visibility rules." },
      { status: 403 },
    );
  }
  return null;
}

const ALLOWED_INTERIOR_STATUS = new Set(["Fully Furnished", "SemiFurnished", "Unfurnished"]);
const ALLOWED_PET_STATUS = new Set(["Allowed", "Not Allowed", "None"]);

const bodySchema = z.object({
  employeeId: z.string().min(1),
  location: z.string().optional().default("All"),
  enabled: z.coerce.boolean().optional().default(false),
  allowedInteriorStatus: z.array(z.string()).optional().default([]),
  allowedPropertyType: z.array(z.string()).optional().default([]),
  allowedPetStatus: z.array(z.string()).optional().default([]),
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

    const allowedInteriorStatus = Array.from(
      new Set(
        (parsed.data.allowedInteriorStatus || [])
          .map((x) => String(x).trim())
          .filter((x) => ALLOWED_INTERIOR_STATUS.has(x)),
      ),
    );
    const allowedPropertyType = Array.from(
      new Set(
        (parsed.data.allowedPropertyType || [])
          .map((x) => String(x).trim())
          .filter(Boolean),
      ),
    );
    const allowedPetStatus = Array.from(
      new Set(
        (parsed.data.allowedPetStatus || [])
          .map((x) => String(x).trim())
          .filter((x) => ALLOWED_PET_STATUS.has(x)),
      ),
    );

    const locKey = location === "All" ? "All" : location.toLowerCase();
    const targetPath =
      location === "All"
        ? "ownerVisibilityRules.all"
        : `ownerVisibilityRules.byLocation.${locKey}`;

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          [targetPath]: { enabled, allowedInteriorStatus, allowedPropertyType, allowedPetStatus },
        },
      },
      { new: true },
    ).select("_id ownerVisibilityRules name email isActive allotedArea");

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
    console.error("owner-visibility-rule PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update owner visibility rule" },
      { status: 500 },
    );
  }
}

