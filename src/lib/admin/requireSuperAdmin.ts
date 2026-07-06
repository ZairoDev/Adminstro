import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function requireSuperAdmin(
  req: NextRequest,
): Promise<NextResponse | null> {
  const token = (await getDataFromToken(req)) as { role?: string } | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "SuperAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
