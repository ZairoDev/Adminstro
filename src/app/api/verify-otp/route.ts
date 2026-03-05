import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(request: NextRequest) {
  const referer = request.headers.get("referer");
  const email = referer?.split("otp/")[1];
  try {
    const reqBody = await request.json();
    const { otp } = reqBody;

    const savedUser = await Employees.find({ email: email });

    if (!savedUser || savedUser.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if employee is active
    if (savedUser[0].isActive === false) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact the administrator to reactivate your account." },
        { status: 403 }
      );
    }

    if (savedUser[0].otpTokenExpiry < Date.now()) {
      return NextResponse.json(
        { error: "Your OTP has expired" },
        { status: 400 }
      );
    }

    if (savedUser[0].otpToken != otp) {
      return NextResponse.json(
        { error: "You have entered wrong OTP" },
        { status: 400 }
      );
    }

    // Generate a fresh session for this OTP-verified login
    const sessionId =
      (globalThis as any)?.crypto?.randomUUID?.() ?? randomUUID();
    const now = Date.now();

    await Employees.updateOne(
      { email: email },
      {
        $unset: { otpToken: "", otpTokenExpiry: "" },
        $set: {
          isLoggedIn: true,
          lastLogin: new Date(),
          sessionId,
          sessionStartedAt: now,
          tokenValidAfter: now,
        },
      }
    );

    // Emit socket event for real-time tracking
    if ((global as any).io) {
      (global as any).io.emit("employee-login", {
        _id: savedUser[0]._id,
        name: savedUser[0].name,
        email: savedUser[0].email,
        role: savedUser[0].role,
        lastLogin: new Date(),
      });
    }

    const tokenData = {
      id: savedUser[0]._id,
      sid: sessionId,
      name: savedUser[0].name,
      email: savedUser[0].email,
      role: savedUser[0].role,
      allotedArea: savedUser[0].allotedArea,
    };

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET as string, {
      expiresIn: "1d",  
    });

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      tokenData,
      status: 200,
    });

    // Set httpOnly auth & session cookies
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
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
        employeeId: savedUser[0]._id.toString(),
        employeeName: savedUser[0].name,
        employeeEmail: savedUser[0].email,
        role: savedUser[0].role,
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
