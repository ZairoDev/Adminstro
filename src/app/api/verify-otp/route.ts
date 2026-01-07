import jwt from "jsonwebtoken";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { NextRequest, NextResponse } from "next/server";
import { getSessionExpiryTimestamp } from "@/util/sessionExpiry";

connectDb();

export async function POST(request: NextRequest) {
  const referer = request.headers.get("referer");
  const email = referer?.split("otp/")[1];
  try {
    const reqBody = await request.json();
    const { otp } = reqBody;

    const savedUser = await Employees.find({ email: email });

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

    // Calculate session expiry based on 11:00 PM IST (testing)
    const expiresAt = getSessionExpiryTimestamp();
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = expiresAt - now;

    console.log(`🔐 OTP Login: ${savedUser[0].email} - Session expires at ${new Date(expiresAt * 1000).toISOString()} (${expiresInSeconds}s from now)`);

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET!, {
      expiresIn: expiresInSeconds,
    });

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
      tokenData: tokenData,
      status: 200,
    });

    // Set secure HttpOnly cookie with sameSite: strict
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(expiresAt * 1000),
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
