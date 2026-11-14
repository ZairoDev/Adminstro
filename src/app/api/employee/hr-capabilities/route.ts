import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";

const ALLOWED = ["HR", "SuperAdmin"] as const;

function unauthorized() {
  return NextResponse.json(
    { success: false, error: "Only HR and SuperAdmin can manage these flags" },
    { status: 403 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    if (!ALLOWED.includes(String(token.role ?? "") as (typeof ALLOWED)[number])) {
      return unauthorized();
    }

    const flag = new URL(request.url).searchParams.get("flag");
    if (flag !== "trainer" && flag !== "reportingManager") {
      return NextResponse.json(
        { success: false, error: "flag must be trainer or reportingManager" },
        { status: 400 },
      );
    }

    await connectDb();
    const query = excludeTestAccountFromQuery({
      isActive: { $ne: false },
      ...(flag === "trainer"
        ? { isTrainer: true }
        : { isReportingManager: true }),
    });

    const rows = await Employees.find(query)
      .select("name email role jobTitle employeeCode isTrainer isReportingManager")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        id: String(row._id),
        name: String(row.name || "").trim(),
        email: String(row.email || "").trim(),
        role: String(row.role || "").trim(),
        jobTitle: String(row.jobTitle || "").trim(),
        employeeCode: row.employeeCode ? String(row.employeeCode) : null,
        isTrainer: row.isTrainer === true,
        isReportingManager: row.isReportingManager === true,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 },
      );
    }
    console.error("hr-capabilities GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load capabilities" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    if (!ALLOWED.includes(String(token.role ?? "") as (typeof ALLOWED)[number])) {
      return unauthorized();
    }

    const body = await request.json();
    const employeeId =
      typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { success: false, error: "Valid employeeId is required" },
        { status: 400 },
      );
    }

    const update: Record<string, boolean> = {};
    if (typeof body.isTrainer === "boolean") update.isTrainer = body.isTrainer;
    if (typeof body.isReportingManager === "boolean") {
      update.isReportingManager = body.isReportingManager;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "Provide isTrainer and/or isReportingManager" },
        { status: 400 },
      );
    }

    await connectDb();
    const employee = await Employees.findOneAndUpdate(
      excludeTestAccountFromQuery({
        _id: employeeId,
        isActive: { $ne: false },
      }),
      { $set: update },
      { new: true },
    ).select("name email role jobTitle employeeCode isTrainer isReportingManager");

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Active employee not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: String(employee._id),
        name: employee.name,
        email: employee.email,
        role: employee.role,
        jobTitle: employee.jobTitle || "",
        employeeCode: employee.employeeCode ?? null,
        isTrainer: employee.isTrainer === true,
        isReportingManager: employee.isReportingManager === true,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 },
      );
    }
    console.error("hr-capabilities PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update capabilities" },
      { status: 500 },
    );
  }
}
