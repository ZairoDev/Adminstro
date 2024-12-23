import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDb } from "@/util/db";
import { sendEmail } from "@/util/mailer";
import Employees from "@/models/employee";

connectDb();

interface Employee {
  _id: string;
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  allotedArea: string;
  role: string;
  passwordExpiresAt: Date;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const reqBody = await request.json();
    const { email, password } = reqBody;
    const Employee = (await Employees.find({ email })) as Employee[];
    if (!Employee || Employee.length === 0) {
      return NextResponse.json(
        { error: "Please enter a valid email or password" },
        { status: 400 }
      );
    }

    const temp: Employee = Employee[0];
    // const validPassword: boolean = await bcryptjs.compare(
    //   password,
    //   temp.password
    // );

    const validPassword: boolean = temp.password === password;
    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    if (
      temp.role !== ("SuperAdmin" as Employee["role"]) &&
      temp.role !== ("HR" as Employee["role"]) &&
      temp.email !== "aishakhatoon03@gmail.com"
    ) {
      console.log("inside if");

      const currentDate = new Date();
      const passwordExpiryDate = new Date(temp.passwordExpiresAt);

      const timeDifference =
        (currentDate.getTime() - passwordExpiryDate.getTime()) /
        (1000 * 60 * 60);

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
    const newExpiryDate = new Date();
    newExpiryDate.setHours(newExpiryDate.getHours() + 24);

    await Employees.updateOne(
      { _id: temp._id },
      { $set: { passwordExpiresAt: newExpiryDate } }
    );

    const tokenData = {
      id: temp._id,
      name: temp.name,
      email: temp.email,
      role: temp.role,
      allotedArea: temp.allotedArea,
    };

    console.log(tokenData, "Token Data ");

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET as string, {
      expiresIn: "1d",
    });

    const response = NextResponse.json({
      message: "Login successful",
      success: true,
      token,
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
