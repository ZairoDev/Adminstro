import Users from "@/models/user";
import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectDb } from "@/util/db";
import { sendEmail } from "@/util/mailer";

connectDb();

interface ReqBody {
  email: string;
  password: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  role: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const reqBody: ReqBody = await request.json();
    const { email, password } = reqBody;
    console.log(email, password)
    const user = (await Users.find({ email })) as User[];

    if (!user || user.length === 0) {
      return NextResponse.json(
        { error: "Please Enter valid email or password" },
        { status: 400 }
      );
    }

    const temp: User = user[0];

    // Check if user is verified
    // if (!temp.isVerified) {
    //   return NextResponse.json(
    //     { error: "Please verify your email before logging in" },
    //     { status: 400 }
    //   );
    // }

    // Check if password is correct
    const validPassword: boolean = await bcryptjs.compare(
      password,
      temp.password
    );

    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    if (temp.role === "SuperAdmin") {
      await sendEmail({
        email,
        emailType: "OTP",
        userId: temp._id,
      });

      return NextResponse.json(
        { message: "Verification OTP sent" },
        { status: 200 }
      );
    }

    // Create token data
    const tokenData = {
      id: temp._id,
      name: temp.name,
      email: temp.email,
      role: temp.role,
    };

    // Create token
    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET as string, {
      expiresIn: "1d",
    });

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token, // Include the token in the response data
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
