import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { NextRequest, NextResponse } from "next/server";
import { getDeviceTypeFromHeaders, WEB_SESSION_DURATION_MS } from "@/util/deviceSession";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const deviceType = getDeviceTypeFromHeaders(request.headers);

    const reqBody = await request.json();
    const referer = request.headers.get("referer");
    const refererEmail = referer?.includes("otp/") ? referer.split("otp/")[1] : undefined;

    // email can arrive as a string (mobile) or string[] (Next.js catch-all route
    // params serialize the path segment as an array, e.g. ["user@example.com"]).
    const rawEmailField = reqBody?.email;
    const rawEmailJoined =
      Array.isArray(rawEmailField)
        ? rawEmailField.map((s: string) => decodeURIComponent(s)).join("").trim()
        : (rawEmailField ?? refererEmail);
    const email =
      typeof rawEmailJoined === "string" ? rawEmailJoined.trim().toLowerCase() : "";

    const otp = reqBody?.otp;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required", code: "MISSING_EMAIL" },
        { status: 400 },
      );
    }

    if (otp === undefined || otp === null || String(otp).trim().length === 0) {
      return NextResponse.json(
        { error: "OTP is required", code: "MISSING_OTP" },
        { status: 400 },
      );
    }

    // Use case-insensitive search to handle emails stored with any casing in the DB
    const savedUser = await Employees.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (!savedUser) {
      console.error("[verify-otp] User not found for email:", email);
      return NextResponse.json(
        { error: "User not found", code: "EMPLOYEE_NOT_FOUND" },
        { status: 400 }
      );
    }

    // Check if employee is active
    if ((savedUser as any).isActive === false) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact the administrator to reactivate your account." },
        { status: 403 }
      );
    }

    const otpExpiry = (savedUser as any).otpTokenExpiry;
    if (typeof otpExpiry !== "number" && !(otpExpiry instanceof Date)) {
      return NextResponse.json(
        { error: "OTP not requested or already used", code: "OTP_NOT_REQUESTED" },
        { status: 400 },
      );
    }

    const otpExpiryMs = otpExpiry instanceof Date ? otpExpiry.getTime() : otpExpiry;
    if (otpExpiryMs < Date.now()) {
      return NextResponse.json(
        { error: "Your OTP has expired" },
        { status: 400 }
      );
    }

    if ((savedUser as any).otpToken != otp) {
      return NextResponse.json(
        { error: "You have entered wrong OTP" },
        { status: 400 }
      );
    }

    // Web: block if an unexpired web session already exists.
    if (deviceType === "web") {
      const existing = (savedUser as any)?.webSession as
        | { sessionId?: string | null; expiresAt?: number | null; isLoggedIn?: boolean }
        | undefined;
      const nowMs = Date.now();
      const alreadyActive =
        existing?.isLoggedIn === true &&
        typeof existing?.sessionId === "string" &&
        existing.sessionId.length > 0 &&
        typeof existing?.expiresAt === "number" &&
        existing.expiresAt > nowMs;

      if (alreadyActive) {
        // OTP verification is a pre-login step — the user cannot have a valid
        // cookie at this point. If they do not carry a token cookie the DB session
        // is stale (browser cleared, incognito window closed, prior cleanup failed).
        // Clear it so the SuperAdmin can complete login instead of hitting a 409.
        const incomingToken = request.cookies.get("token")?.value;
        if (!incomingToken) {
          await Employees.updateOne(
            { _id: (savedUser as any)._id },
            {
              $set: {
                "webSession.sessionId": null,
                "webSession.sessionStartedAt": null,
                "webSession.expiresAt": null,
                "webSession.isLoggedIn": false,
              },
            },
          );
          // Fall through to issue a fresh session below
        } else {
          return NextResponse.json(
            { error: "User already logged in on another tab/device" },
            { status: 409 },
          );
        }
      }
    }

    // Mobile: block if an active mobile session already exists.
    if (deviceType === "mobile") {
      const existing = (savedUser as any)?.mobileSession as
        | { sessionId?: string | null; isLoggedIn?: boolean }
        | undefined;
      const alreadyActive =
        existing?.isLoggedIn === true &&
        typeof existing?.sessionId === "string" &&
        existing.sessionId.length > 0;

      if (alreadyActive) {
        return NextResponse.json(
          { error: "This account is already logged in on another mobile device. Please log out from that device first." },
          { status: 409 },
        );
      }
    }

    // Generate a fresh session for this OTP-verified login
    const sessionId =
      (globalThis as any)?.crypto?.randomUUID?.() ?? randomUUID();
    const now = Date.now();

    const webSessionUpdate = {
      "webSession.isLoggedIn": true,
      "webSession.sessionId": sessionId,
      "webSession.sessionStartedAt": now,
      "webSession.expiresAt": now + WEB_SESSION_DURATION_MS,
    };
    const mobileSessionUpdate = {
      "mobileSession.isLoggedIn": true,
      "mobileSession.sessionId": sessionId,
      "mobileSession.sessionStartedAt": now,
      "mobileSession.lastActiveAt": now,
    };

    await Employees.updateOne(
      { _id: (savedUser as any)._id },
      {
        $unset: { otpToken: "", otpTokenExpiry: "" },
        $set: {
          lastLogin: new Date(),
          ...(deviceType === "mobile" ? mobileSessionUpdate : webSessionUpdate),
        },
      }
    );

    // Emit socket event for real-time tracking
    if ((global as any).io) {
      (global as any).io.emit("employee-login", {
        _id: (savedUser as any)._id,
        name: (savedUser as any).name,
        email: (savedUser as any).email,
        role: (savedUser as any).role,
        lastLogin: new Date(),
      });
    }

    const tokenData = {
      id: (savedUser as any)._id,
      sid: sessionId,
      name: (savedUser as any).name,
      email: (savedUser as any).email,
      role: (savedUser as any).role,
      allotedArea: (savedUser as any).allotedArea,
    };

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET as string, {
      ...(deviceType === "web" ? { expiresIn: "12h" } : {}),
    });

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      tokenData,
      status: 200,
    });

    if (deviceType === "web") {
      // Set httpOnly auth & session cookies (web only)
      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      try {
        response.cookies.set("sessionId", sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      } catch {
        // ignore cookie errors
      }
    }

    // Best-effort login activity log
    try {
      const { getClientIpFromHeaders } = await import("@/util/getClientIp");
      const ipAddress =
        getClientIpFromHeaders(request.headers) ||
        request.headers.get("x-forwarded-for")?.split(",")[0] ||
        request.headers.get("x-real-ip") ||
        "Unknown";
      const userAgent = request.headers.get("user-agent") || "";

      const activityLog = new EmployeeActivityLog({
        employeeId: (savedUser as any)._id.toString(),
        employeeName: (savedUser as any).name,
        employeeEmail: (savedUser as any).email,
        role: (savedUser as any).role,
        activityType: "login",
        loginTime: new Date(),
        sessionId,
        status: "active",
        lastActivityAt: new Date(),
        ipAddress,
        userAgent,
        notes: "Login through employee portal (OTP verified)",
      });
      await activityLog.save().catch(() => {});
    } catch {
      // non-critical
    }

    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
