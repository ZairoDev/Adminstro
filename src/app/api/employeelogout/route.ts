import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import type { NextRequest, NextResponse as ResponseType } from "next/server";
import jwt from "jsonwebtoken";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { getAttendanceDeviceFromHeaders } from "@/util/attendanceDevice";
import { getDeviceTypeFromHeaders } from "@/util/deviceSession";
import { endActiveEmployeeLoginSessions } from "@/util/employeeActivitySession";
import { getClientIpFromHeaders } from "@/util/getClientIp";

export const dynamic = "force-dynamic";

type TokenPayload = {
  id: string;
  sid?: string;
  name?: string;
  email?: string;
  role?: string;
};

async function processEmployeeLogout(
  request: NextRequest,
  decoded: TokenPayload,
  deviceType: "web" | "mobile",
): Promise<void> {
  const logoutTime = new Date();
  const invalidatedAt = logoutTime.getTime();
  const sessionIdFromToken = decoded.sid;
  const sessionId =
    sessionIdFromToken || request.cookies.get("sessionId")?.value || null;
  const employeeId = String(decoded.id);

  // Full slot wipe + device token invalidation.
  // webTokenValidAfter / mobileTokenValidAfter must bump so a concurrent
  // heartbeat cannot revive the slot via restoreWebSessionIfSwept after logout.
  const slotUnset =
    deviceType === "mobile"
      ? {
          "mobileSession.sessionId": null,
          "mobileSession.sessionStartedAt": null,
          "mobileSession.lastActiveAt": null,
          "mobileSession.isLoggedIn": false,
          mobileTokenValidAfter: invalidatedAt,
        }
      : {
          "webSession.sessionId": null,
          "webSession.sessionStartedAt": null,
          "webSession.expiresAt": null,
          "webSession.lastActiveAt": null,
          "webSession.pendingReleaseAt": null,
          "webSession.isLoggedIn": false,
          webTokenValidAfter: invalidatedAt,
        };

  const sessionField =
    deviceType === "mobile" ? "mobileSession.sessionId" : "webSession.sessionId";

  // Prefer clearing the exact sid. If that matches 0 docs (stale/mismatched
  // JWT sid vs DB), still free this device slot so "logout success" is real.
  let result = await Employees.updateOne(
    {
      _id: decoded.id,
      ...(sessionIdFromToken ? { [sessionField]: sessionIdFromToken } : {}),
    },
    { $set: { lastLogout: logoutTime, ...slotUnset } },
  );

  if (result.matchedCount === 0) {
    result = await Employees.updateOne(
      { _id: decoded.id },
      { $set: { lastLogout: logoutTime, ...slotUnset } },
    );
  }

  if (result.matchedCount === 0) {
    console.warn(
      `[employeelogout] DB slot clear missed for employee=${employeeId} device=${deviceType}`,
    );
  }

  try {
    await endActiveEmployeeLoginSessions({
      employeeId,
      logoutTime,
      sessionId,
    });
  } catch (e) {
    console.warn("Session-based logout update failed:", e);
  }

  try {
    const employee = await Employees.findById(decoded.id);
    if (employee) {
      const ipAddress =
        getClientIpFromHeaders(request.headers) ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "Unknown";

      const activityLog = new EmployeeActivityLog({
        employeeId,
        employeeName: decoded.name || employee.name,
        employeeEmail: decoded.email || employee.email,
        role: decoded.role || employee.role,
        activityType: "logout",
        logoutTime,
        sessionId,
        status: "ended",
        lastActivityAt: logoutTime,
        ipAddress,
        userAgent: request.headers.get("user-agent") || "",
        deviceInfo: getAttendanceDeviceFromHeaders(request.headers, deviceType),
        notes: "Logout from employee portal",
      });

      await activityLog.save().catch((err: Error) => {
        console.warn("Failed to log logout activity:", err.message);
      });
    }
  } catch (activityError) {
    console.warn("Activity logging failed (non-critical):", activityError);
  }

  const io = (global as unknown as {
    io?: { emit: (event: string, data: object) => void };
  }).io;
  if (io) {
    io.emit("employee-logout", { _id: decoded.id, email: decoded.email });
  }
}

async function handleLogout(request: NextRequest): Promise<ResponseType> {
  try {
    await connectDb();
    const deviceType = getDeviceTypeFromHeaders(request.headers);
    const token =
      request.cookies.get("token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (token) {
      let decoded: TokenPayload | null = null;

      try {
        decoded = jwt.verify(
          token,
          process.env.TOKEN_SECRET as string,
        ) as TokenPayload;
      } catch {
        const unverified = jwt.decode(token) as TokenPayload | null;
        if (unverified?.id) decoded = unverified;
      }

      if (decoded?.id) {
        await processEmployeeLogout(request, decoded, deviceType);
      }
    }

    const response = NextResponse.json({
      message: "Logged out successfully",
      success: true,
    });

    if (deviceType === "web") {
      response.cookies.delete({
        name: "token",
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      try {
        response.cookies.delete({
          name: "sessionId",
          path: "/",
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      } catch {
        // ignore
      }
    }

    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      { message: "An error occurred", success: false },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<ResponseType> {
  return handleLogout(request);
}

// Client logout posts first (logoutAlertBox); keep GET for beacons / interceptors.
export async function POST(request: NextRequest): Promise<ResponseType> {
  return handleLogout(request);
}
