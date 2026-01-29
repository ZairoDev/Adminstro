import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { sendEmail } from "@/util/mailer";
import Employees from "@/models/employee";
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
      return NextResponse.json(
        {
          message: "Login successful",
          otpRequired: false,
          token,
          tokenData: testAccountTokenData,
        },
        { status: 200 }
      );
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
      if (temp.email === "ankitanigam1993@gmail.com" || temp.email === TEST_SUPERADMIN_EMAIL) {
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

        return NextResponse.json(
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

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      tokenData: tokenData,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
