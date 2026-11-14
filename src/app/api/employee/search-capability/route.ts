import { NextRequest, NextResponse } from "next/server";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";

const ALLOWED = ["HR", "SuperAdmin", "Admin", "HAdmin"] as const;

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role ?? "");
    if (!ALLOWED.includes(role as (typeof ALLOWED)[number])) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const capability = searchParams.get("capability");
    const q = (searchParams.get("q") || "").trim();
    const excludeId = (searchParams.get("excludeId") || "").trim();

    if (capability !== "trainer" && capability !== "reportingManager") {
      return NextResponse.json(
        { success: false, error: "capability must be trainer or reportingManager" },
        { status: 400 },
      );
    }
    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    await connectDb();
    const flag =
      capability === "trainer"
        ? { isTrainer: true }
        : { isReportingManager: true };

    const filter = excludeTestAccountFromQuery({
      isActive: { $ne: false },
      ...flag,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { employeeCode: { $regex: q, $options: "i" } },
      ],
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    const rows = await Employees.find(filter)
      .select("name email role jobTitle employeeCode")
      .sort({ name: 1 })
      .limit(15)
      .lean();

    const data = rows.map((row) => ({
      id: String(row._id),
      name: String(row.name || "").trim(),
      email: String(row.email || "").trim(),
      role: String(row.role || "").trim(),
      jobTitle: String(row.jobTitle || "").trim(),
      employeeCode: row.employeeCode ? String(row.employeeCode) : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 },
      );
    }
    console.error("search-capability error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search employees" },
      { status: 500 },
    );
  }
}
