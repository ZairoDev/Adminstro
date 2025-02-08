import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
connectDb();
import Users from "@/models/user";
import bcryptjs from "bcryptjs";
import { sendEmail } from "@/util/mailer";
import { userSchema } from "@/schemas/user.schema";
import crypto from "crypto";

const generateRandomPassword = (length: number): string => {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}; 
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const reqBody = await request.json();
    const parsedBody = userSchema.parse(reqBody);

    const {
      name,
      email,
      role,
      sendDetails,     
      phone,
      gender,
      nationality,
      spokenLanguage,
      bankDetails,
      address,
      profilePic,
    } = parsedBody;

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }
    const plainPassword = generateRandomPassword(8);
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(plainPassword, salt);

    const newUser = new Users({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      gender,
      nationality,
      spokenLanguage,
      bankDetails,
      address,
      profilePic,
    });
    const savedUser = await newUser.save();

    if (sendDetails) {
      await sendEmail({
        email,
        emailType: "VERIFY",
        userId: savedUser._id.toString(),
        password: plainPassword,
      });
    }
    return NextResponse.json({
      message: "User created successfully.",
      success: true,
      password: plainPassword,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error while creating user:", error);
    return NextResponse.json(
      { error: "Error while creating user" },
      { status: 500 }
    );
  }
}
