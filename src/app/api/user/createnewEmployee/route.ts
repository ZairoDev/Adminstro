import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";

connectDb();

import Employees from "@/models/employees";
import bcryptjs from "bcryptjs";
import { employeeSchema } from "@/schemas/employee.schema";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const reqBody = await request.json();
    const parsedBody = employeeSchema.parse(reqBody);

    console.log(parsedBody);

    const {
      name,
      email,
      role,
      gender,
      country,
      nationality,
      spokenLanguage,
      address,
      accountNo,
      ifsc,
      aadhar,
      alias,
      dateOfJoining,
      experience,
      phone,
      password,
      profilePic,
    } = parsedBody;

    const existingUser = await Employees.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const newUser = new Employees({
      name,
      email,
      role,
      gender,
      country,
      nationality,
      spokenLanguage,
      address,
      accountNo,
      ifsc,
      aadhar,
      alias,
      dateOfJoining,
      experience,
      phone,
      password: hashedPassword,
      profilePic,
    });
    const createUser = await newUser.save();

    console.log(newUser);
    console.log(createUser);

    return NextResponse.json({
      message: "User created successfully.",
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message);
      return NextResponse.json({ errors: errorMessages }, { status: 400 });
    }

    console.error("Error while creating user:", error);
    return NextResponse.json(
      { error: "Error while creating user" },
      { status: 500 }
    );
  }
}
