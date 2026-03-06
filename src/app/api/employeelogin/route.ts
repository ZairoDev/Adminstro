import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { connectDb } from "@/util/db";
import { sendEmail } from "@/util/mailer";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { TEST_SUPERADMIN_EMAIL, TEST_SUPERADMIN_PASSWORD } from "@/util/employeeConstants";

interface Employee {
  _id: string;
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  isActive?: boolean;
  allotedArea: [string];
  role: string;
  isLocked: boolean;
  passwordExpiresAt: Date;
  sessionId?: string | null;
  sessionStartedAt?: number | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDb();

    const reqBody = await request.json();
    const { email, password } = reqBody;
    const trimmedPassword = password?.trim() ?? "";
    const SESSION_DURATION = 24 * 60 * 60 * 1000;

    const sessionIdVar = (globalThis as any)?.crypto?.randomUUID
      ? (globalThis as any).crypto.randomUUID()
      : randomUUID();

    // Test SuperAdmin: credentials-only login for QA, no DB record
    if (email === TEST_SUPERADMIN_EMAIL && trimmedPassword === TEST_SUPERADMIN_PASSWORD) {
      const now = Date.now();
      const testAccountTokenData = {
        id: "test-superadmin",
        sid: sessionIdVar,
        name: "Test SuperAdmin",
        email: TEST_SUPERADMIN_EMAIL,
        role: "SuperAdmin",
        allotedArea: [] as string[],
      };
      const token = jwt.sign(
        testAccountTokenData,
        process.env.TOKEN_SECRET as string,
        { expiresIn: "1d" }
      );
      
      const response = NextResponse.json(
        {
          message: "Login successful",
          otpRequired: false,
          token,
          tokenData: testAccountTokenData,
        },
        { status: 200 }
      );
      
      // Set httpOnly cookie for test account
      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      // set sessionId cookie for this test session (no activity logged for test)
      try {
        const testSessionId = (globalThis as any)?.crypto?.randomUUID
          ? (globalThis as any).crypto.randomUUID()
          : randomUUID();
        response.cookies.set("sessionId", testSessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      } catch (e) {}
      
      return response;
    }

    const Employee = await Employees.find({ email });
    if (!Employee || Employee.length === 0) {
      return NextResponse.json(
        { error: "Please enter a valid email or password" },
        { status: 400 }
      );
    }

    const temp: Employee = Employee[0];
    
    // Check if employee is active
    if (temp.isActive === false) {
      return NextResponse.json(
        { error: "Your account has been deactivated. Please contact the administrator to reactivate your account." },
        { status: 403 }
      );
    }

    if (temp.isLocked) {
      return NextResponse.json(
        { error: "Your account has been locked. Please contact the administrator to unlock your account." },
        { status: 403 }
      );
    }
    // const validPassword: boolean = await bcryptjs.compare(
    //   password,
    //   temp.password
    // );
    const validPassword: boolean = temp.password === password.trim();
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    if (
      temp.sessionId &&
      temp.sessionStartedAt &&
      Date.now() - temp.sessionStartedAt < SESSION_DURATION
    ) {
      return NextResponse.json(
        { error: "User already logged in on another device" },
        { status: 409 },
      );
    } 

    if (
      temp.role !== ("SuperAdmin" as Employee["role"]) &&
      temp.role !== ("HR" as Employee["role"]) &&
      temp.role !== ("HAdmin" as Employee["role"]) &&
      temp.email !== "aishakhatoon03@gmail.com"
    ) {
      const currentDate = new Date();
      const passwordExpiryDate = new Date(temp.passwordExpiresAt);

      const timeDifference =
        (currentDate.getTime() - passwordExpiryDate.getTime()) / (1000 * 60 * 60);

      if (timeDifference > 24) {
        return NextResponse.json(
          {
            error:
              "Your password has expired. Please contact the owner for a new password.",
          },
          { status: 403 }
        );
      }
    }

    if (temp.role === "SuperAdmin") {
      // SuperAdmin OTP bypass for specific accounts
      if ( temp.email === TEST_SUPERADMIN_EMAIL) {
        const now = Date.now();
        await Employees.updateOne(
          { _id: temp._id },
          {
            $set: {
              isLoggedIn: true,
              lastLogin: new Date(),
              sessionId: sessionIdVar,
              sessionStartedAt: now,
              tokenValidAfter: now,
            },
          }
        );

        // Emit socket for real-time tracking (exclude test account from lists)
        if ((global as any).io && temp.email !== TEST_SUPERADMIN_EMAIL) {
          (global as any).io.emit("employee-login", {
            _id: temp._id,
            name: temp.name,
            email: temp.email,
            role: temp.role,
            lastLogin: new Date(),
          }        );
        }

        const tokenPayload = {
          id: temp._id,
          sid: sessionIdVar,
          name: temp.name,
          email: temp.email,
          role: temp.role,
          allotedArea: temp.allotedArea,
        };
        const token = jwt.sign(
          tokenPayload,
          process.env.TOKEN_SECRET as string,
          { expiresIn: "1d" }
        );

        const response = NextResponse.json(
          {
            message: "Login successful",
            otpRequired: false,
            token,
            tokenData: tokenPayload,
          },
          { status: 200 }
        );
        
        // Set httpOnly cookie
        response.cookies.set("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        });
        
        // set sessionId cookie for this session
        try {

          response.cookies.set("sessionId", sessionIdVar , {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          });
        } catch (e) {}
        
        return response;
      }
      await sendEmail({
        email,
        emailType: "OTP",
        userId: temp._id,
      });


      return NextResponse.json(
        { message: "Verification OTP sent", otpRequired: true },
        { status: 200 }
      );
    }
    const newExpiryDate = new Date();

    if (temp.role === "HR" || temp.role === "Sales") {
      newExpiryDate.setHours(newExpiryDate.getHours() + 96);
    } else {
      newExpiryDate.setHours(newExpiryDate.getHours() + 24);
    }

    const now = Date.now();
    await Employees.updateOne(
      { _id: temp._id },
      {
        $set: {
          passwordExpiresAt: newExpiryDate,
          isLoggedIn: true,
          lastLogin: new Date(),
          sessionId: sessionIdVar,
          sessionStartedAt: now,
          tokenValidAfter: now,
        },
      }
    );

    console.log(`✅ Employee logged in: ${temp.email}, isLoggedIn set to true`);

    // Emit socket event for real-time tracking
    if ((global as any).io) {
      console.log(`📡 Emitting employee-login event for: ${temp.email}`);
      (global as any).io.emit("employee-login", {
        _id: temp._id.toString(),
        name: temp.name,
        email: temp.email,
        role: temp.role,
        lastLogin: new Date().toISOString(),
      });
    } else {
      console.log("⚠️ Socket.io not available on global");
    }

    const tokenData = {
      id: temp._id,
      sid: sessionIdVar,
      name: temp.name,
      email: temp.email,
      role: temp.role,
      allotedArea: temp.allotedArea,
    };

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET as string, {
      expiresIn: "1d",
    });

    // Log login activity
    try {
    const { getClientIpFromHeaders } = await import("@/util/getClientIp");
    const ipAddress = (() => {
      const h = getClientIpFromHeaders(request.headers);
      return h || request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "Unknown";
    })();
      const userAgent = request.headers.get("user-agent") || "";
      // generate a session id for this device/session

      const activityLog = new EmployeeActivityLog({
        employeeId: temp._id.toString(),
        employeeName: temp.name,
        employeeEmail: temp.email,
        role: temp.role,
        activityType: "login",
        loginTime: new Date(),
        sessionId: sessionIdVar,
        status: "active",
        lastActivityAt: new Date(),
        ipAddress: ipAddress,
        userAgent: userAgent,
        notes: "Login through employee portal",
      });
      
      await activityLog.save().catch((err: Error) => {
        console.warn("Failed to log activity:", err.message);
        // Don't throw error - activity logging should not break login
      });
    } catch (activityError) {
      console.warn("Activity logging failed (non-critical):", activityError);
      // Don't throw error - activity logging should not break login
    }

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      tokenData: tokenData,
    });

    // set sessionId cookie (HttpOnly) for future session-specific logout/activity updates
    try {
      if (sessionIdVar) {
        response.cookies.set("sessionId", sessionIdVar, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
      }
    } catch (e) {
      // ignore cookie set errors
    }

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// legacy: kept for backward compatibility if other modules call it (internal only)
function extractIPFromRequestLegacy(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return (forwarded ? forwarded.split(",")[0] : real) || "Unknown";
}
