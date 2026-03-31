import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { buildAuthErrorResponse } from "@/util/authErrorResponse";
import EmployeeUiRule from "@/models/employeeUiRule";

export const dynamic = "force-dynamic";

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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // Rules are predefined (no edits via API)
  await getDataFromToken(request);
  return NextResponse.json(
    { error: "Rules are predefined and cannot be edited." },
    { status: 403 },
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  // Rules are predefined (no deletes via API)
  await getDataFromToken(request);
  return NextResponse.json(
    { error: "Rules are predefined and cannot be deleted." },
    { status: 403 },
  );
}

