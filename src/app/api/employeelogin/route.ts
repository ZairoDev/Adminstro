import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { connectDb } from "@/util/db";
import { sendEmail } from "@/util/mailer";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { TEST_SUPERADMIN_EMAIL, TEST_SUPERADMIN_PASSWORD } from "@/util/employeeConstants";

connectDb();

interface Employee {
  _id: string;
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  isActive?: boolean;
  allotedArea: [string];
  role: string;
  passwordExpiresAt: Date;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let sessionIdVar: string | null = null;
    const reqBody = await request.json();
    const { email, password } = reqBody;
    const trimmedPassword = password?.trim() ?? "";

    // Test SuperAdmin: credentials-only login for QA, no DB record
    if (email === TEST_SUPERADMIN_EMAIL && trimmedPassword === TEST_SUPERADMIN_PASSWORD) {
      const testAccountTokenData = {
        id: "test-superadmin",
        name: "Test SuperAdmin",
        email: TEST_SUPERADMIN_EMAIL,
        role: "SuperAdmin",
        allotedArea: [] as string[],
      };
      const token = jwt.sign(
        testAccountTokenData,
        process.env.TOKEN_SECRET as string,
        { expiresIn: "2d" }
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
    
    // const validPassword: boolean = await bcryptjs.compare(
    //   password,
    //   temp.password
    // );
    const validPassword: boolean = temp.password === password.trim();
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
    }

    if (
      temp.role !== ("SuperAdmin" as Employee["role"]) &&
      temp.role !== ("HR" as Employee["role"]) &&
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
        await Employees.updateOne(
          { _id: temp._id },
          { $set: { isLoggedIn: true, lastLogin: new Date() } }
        );

        // Emit socket for real-time tracking (exclude test account from lists)
        if ((global as any).io && temp.email !== TEST_SUPERADMIN_EMAIL) {
          (global as any).io.emit("employee-login", {
            _id: temp._id,
            name: temp.name,
            email: temp.email,
            role: temp.role,
            lastLogin: new Date(),
          });
        }

        const token = jwt.sign(
          {
            id: temp._id,
            name: temp.name,
            email: temp.email,
            role: temp.role,
            allotedArea: temp.allotedArea,
          },
          process.env.TOKEN_SECRET as string,
          { expiresIn: "2d" }
        );

        const response = NextResponse.json(
          {
            message: "Login successful",
            otpRequired: false,
            token,
            tokenData: {
              id: temp._id,
              name: temp.name,
              email: temp.email,
              role: temp.role,
              allotedArea: temp.allotedArea,
            },
          },
          { status: 200 }
        );
        
        // Set httpOnly cookie
        response.cookies.set("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
        
        // set sessionId cookie for this session
        try {
          const saSessionId = (globalThis as any)?.crypto?.randomUUID
            ? (globalThis as any).crypto.randomUUID()
            : randomUUID();
          response.cookies.set("sessionId", saSessionId, {
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

    await Employees.updateOne(
      { _id: temp._id },
      { $set: { passwordExpiresAt: newExpiryDate, isLoggedIn: true, lastLogin: new Date() } }
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
      name: temp.name,
      email: temp.email,
      role: temp.role,
      allotedArea: temp.allotedArea,
    };

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET as string, {
      expiresIn: "2d",
    });

    // Log login activity
    try {
      const ipAddress = extractIPFromRequest(request);
      const userAgent = request.headers.get("user-agent") || "";
      // generate a session id for this device/session
      const sessionId = (globalThis as any)?.crypto?.randomUUID
        ? (globalThis as any).crypto.randomUUID()
        : randomUUID();
      sessionIdVar = sessionId;

      const activityLog = new EmployeeActivityLog({
        employeeId: temp._id.toString(),
        employeeName: temp.name,
        employeeEmail: temp.email,
        role: temp.role,
        activityType: "login",
        loginTime: new Date(),
        sessionId,
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
    });

    return response;
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function extractIPFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const real = request.headers.get("x-real-ip");
  return (forwarded ? forwarded.split(",")[0] : real) || "Unknown";
}
