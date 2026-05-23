import { connectDb } from "@/util/db";
import { NextResponse } from "next/server";
import type { NextRequest, NextResponse as ResponseType } from "next/server";
import jwt from "jsonwebtoken";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
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
  const sessionIdFromToken = decoded.sid;
  const sessionId =
    sessionIdFromToken || request.cookies.get("sessionId")?.value || null;
  const employeeId = String(decoded.id);

  const slotUnset =
    deviceType === "mobile"
      ? {
          "mobileSession.sessionId": null,
          "mobileSession.sessionStartedAt": null,
          "mobileSession.lastActiveAt": null,
          "mobileSession.isLoggedIn": false,
        }
      : {
          "webSession.sessionId": null,
          "webSession.sessionStartedAt": null,
          "webSession.expiresAt": null,
          "webSession.isLoggedIn": false,
        };

  const sessionField =
    deviceType === "mobile" ? "mobileSession.sessionId" : "webSession.sessionId";

  await Employees.updateOne(
    {
      _id: decoded.id,
      ...(sessionIdFromToken ? { [sessionField]: sessionIdFromToken } : {}),
    },
    { $set: { lastLogout: logoutTime, ...slotUnset } },
  );

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

export async function GET(request: NextRequest): Promise<ResponseType> {
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
