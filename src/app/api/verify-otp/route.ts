import jwt from "jsonwebtoken";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
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

    await Employees.updateOne(
      { email: email },
      // { $set: { otpToken: undefined, otpTokenExpiry: undefined } }
      { $unset: { otpToken: "", otpTokenExpiry: "" }, $set: { isLoggedIn: true, lastLogin: new Date() } }
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
      name: savedUser[0].name,
      email: savedUser[0].email,
      role: savedUser[0].role,
      allotedArea: savedUser[0].allotedArea,
    };

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET!, {
      expiresIn: "1d",
    });

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      tokenData: tokenData,
      status: 200,
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
