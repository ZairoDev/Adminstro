import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";

connectDb();

export async function POST(request: NextRequest) {
  const referer = request.headers.get("referer");
  const email = referer?.split("otp/")[1];
  try {
    const reqBody = await request.json();
    const { otp } = reqBody;

    const savedUser = await Employees.find({ email: email });

    if (savedUser[0].otpTokenExpiry < Date.now()) {
      console.log("otp expired");
      return NextResponse.json(
        { error: "Your OTP has expired" },
        { status: 400 }
      );
    }

    if (savedUser[0].otpToken != otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    await Employees.updateOne(
      { email: email },
      // { $set: { otpToken: undefined, otpTokenExpiry: undefined } }
      { $unset: { otpToken: "", otpTokenExpiry: "" } }
    );

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
