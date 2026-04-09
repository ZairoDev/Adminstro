import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import bcryptjs from "bcryptjs";
import { employeeSchema } from "@/schemas/employee.schema";
import { getDataFromToken } from "@/util/getDataFromToken";
import { computePasswordExpiryDate } from "@/util/passwordExpiry";

export async function POST(request: NextRequest): Promise<NextResponse> {
  await connectDb();
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(request);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    // Verify authorization (only SuperAdmin, Admin, HR can create employees)
    const allowedRoles = ["SuperAdmin", "Admin", "HR", "HAdmin"];
    if (!auth?.role || !allowedRoles.includes(auth.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 },
      );
    }
    
    const reqBody = await request.json();
    // Convert dateOfJoining from string to Date
    if (reqBody.dateOfJoining) {
      const dt = new Date(reqBody.dateOfJoining);
      reqBody.dateOfJoining = dt;
    }
    // Convert dateOfBirth from string to Date
    if (reqBody.dateOfBirth) {
      const dob = new Date(reqBody.dateOfBirth);
      reqBody.dateOfBirth = dob;
    }
    const parsedBody = employeeSchema.parse(reqBody);
    // console.log(parsedBody);
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
      dateOfBirth,
      experience,
      phone,
      password,
      profilePic,
      organization: requestedOrganization,
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

    const organization =
      auth.role === "HAdmin"
        ? "Holidaysera"
        : role === "hSale"
          ? "Holidaysera"
          : requestedOrganization || "VacationSaga";

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
      dateOfBirth,
      experience,
      phone,
      // password: hashedPassword,
      password,
      profilePic,
      organization,
      passwordExpiresAt: computePasswordExpiryDate(),
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
