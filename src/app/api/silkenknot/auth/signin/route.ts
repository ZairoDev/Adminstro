import { SignJWT } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { Users } from "@/models/users";

export async function POST(req: NextRequest) {
  const userBody = await req.json();
  const { email, password } = userBody;

  try {
    const user = await Users.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const tokenData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: "user",
    };

    const secret = new TextEncoder().encode(process.env.TOKEN_SECRET!);
    const token = await new SignJWT(tokenData)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1d")
      .sign(secret);

    const response = NextResponse.json({
      message: "User created successfully",
      success: true,
      token: token,
    });

    response.cookies.set("silkenknot-token", token, {
      httpOnly: true,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to Login" }, { status: 500 });
  }
}
