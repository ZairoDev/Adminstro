import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic";

function ensureHrOrSuperAdmin(role: unknown) {
  const r = String(role || "");
  if (r !== "HR" && r !== "SuperAdmin") {
    return NextResponse.json(
      { error: "Unauthorized. Only HR/SuperAdmin can set visibility rules." },
      { status: 403 },
    );
  }
  return null;
}

const ALLOWED_FURNISHING = new Set(["Furnished", "Semi-furnished", "Unfurnished"]);

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

    const allowedFurnishingRaw = Array.isArray(body?.allowedFurnishing)
      ? body.allowedFurnishing
      : [];
    const allowedTypeOfPropertyRaw = Array.isArray(body?.allowedTypeOfProperty)
      ? body.allowedTypeOfProperty
      : [];

    const allowedFurnishing = Array.from(
      new Set(
        allowedFurnishingRaw
          .map((x: any) => String(x).trim())
          .filter((x: string) => ALLOWED_FURNISHING.has(x)),
      ),
    );
    const allowedTypeOfProperty = Array.from(
      new Set(
        allowedTypeOfPropertyRaw
          .map((x: any) => String(x).trim())
          .filter(Boolean),
      ),
    );

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const locKey = location === "All" ? "All" : location.toLowerCase();
    const targetPath =
      location === "All"
        ? "propertyVisibilityRules.all"
        : `propertyVisibilityRules.byLocation.${locKey}`;

    const updated = await Employees.findByIdAndUpdate(
      employeeId,
      {
        $set: {
          [targetPath]: { enabled, allowedFurnishing, allowedTypeOfProperty },
        },
      },
      { new: true },
    ).select("_id propertyVisibilityRules name email isActive allotedArea");

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
    console.error("property-visibility-rule PUT error:", error);
    return NextResponse.json(
      { error: err?.message || "Failed to update visibility rule" },
      { status: 500 },
    );
  }
}

