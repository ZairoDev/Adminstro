import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import Employees from "@/models/employee";

connectDb();

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();
    const {
      employeeId,
      employeeName,
      employeeEmail,
      role,
      activityType,
      loginTime,
      logoutTime,
      duration,
      ipAddress,
      userAgent,
      deviceInfo,
      location,
      notes,
      sessionId,
      status,
      lastActivityAt,
    } = reqBody;

    // Validate required fields
    if (!employeeId || !employeeName || !employeeEmail || !role || !activityType) {
      return NextResponse.json(
        {
          error: "Missing required fields: employeeId, employeeName, employeeEmail, role, activityType",
        },
        { status: 400 }
      );
    }

    // Validate activityType
    if (!["login", "logout"].includes(activityType)) {
      return NextResponse.json(
        { error: "activityType must be 'login' or 'logout'" },
        { status: 400 }
      );
    }

    // Create activity log
    const activityLog = new EmployeeActivityLog({
      employeeId,
      employeeName,
      employeeEmail,
      role,
      activityType,
      loginTime: activityType === "login" ? loginTime || new Date() : null,
      logoutTime: activityType === "logout" ? logoutTime || new Date() : null,
      duration: duration || 0,
      sessionId: sessionId || null,
      status: status || null,
      lastActivityAt: lastActivityAt || null,
      ipAddress: ipAddress || (await import("@/util/getClientIp")).getClientIpFromHeaders(request.headers) || request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "Unknown",
      userAgent: userAgent || request.headers.get("user-agent") || "",
      deviceInfo: deviceInfo || "",
      location: location || "",
      notes: notes || "",
    });

    await activityLog.save();

    return NextResponse.json(
      {
        message: "Activity logged successfully",
        success: true,
        data: activityLog,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error logging activity:", error);
    return NextResponse.json(
      { error: "Failed to log activity", success: false },
      { status: 500 }
    );
  }
}

// legacy kept if needed elsewhere (internal only)
function extractIPFromRequestLegacy(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return (forwarded ? forwarded.split(",")[0] : real) || "Unknown";
}
