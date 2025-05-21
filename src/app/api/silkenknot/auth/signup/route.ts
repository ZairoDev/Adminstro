import { SignJWT } from "jose";
import bcryptjs from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { Users } from "@/models/users";

export async function POST(req: NextRequest) {
  const userBody = await req.json();

  const { password } = userBody;

  const salt = await bcryptjs.genSalt(8);
  const hashedPassword = await bcryptjs.hash(password, salt);

  userBody.password = hashedPassword;

  try {
    const user = await Users.create(userBody);

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
    const error = new Error(err);
    console.log("error: ", error.message);
    return NextResponse.json({ error: "Failed to sign up" }, { status: 500 });
  }
}
