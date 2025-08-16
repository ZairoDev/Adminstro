import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import bcryptjs from "bcryptjs";
import { employeeSchema } from "@/schemas/employee.schema";
connectDb();
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const reqBody = await request.json();
    const dt = new Date(reqBody.dateOfJoining);
    reqBody.dateOfJoining = dt;
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
      duration,
      allotedArea,
      accountNo,
      empType,
      assignedCountry,
      salary,
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

    // const passwordExpiresAt = new Date();
    // passwordExpiresAt.setHours(passwordExpiresAt.getHours() + 24);

    const newUser = new Employees({
      name,
      email,
      role,
      duration,
      gender,
      country,
      nationality,
      spokenLanguage,
      address,
      allotedArea,
      accountNo,
      ifsc,
      aadhar,
      alias,
      empType,
      assignedCountry,
      salary,
      dateOfJoining,
      experience,
      phone,
      // password: hashedPassword,
      password,
      profilePic,
    });
    const createUser = await newUser.save();

    return NextResponse.json({
      message: "Employee created successfully.",
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message);
      return NextResponse.json({ errors: errorMessages }, { status: 400 });
    }
    console.error("Error while creating Employee:", error);
    return NextResponse.json(
      { error: "Error while creating user" },
      { status: 500 }
    );
  }
}
