import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

function generatePassword() {
  const length = 6;
  const charset = "0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export const GET = async (req: NextRequest) => {
  try {
    const excludedRoles = ["SuperAdmin", "Developer", "HR", "Content"];

    const employees = await Employees.find({ role: { $nin: excludedRoles } });
    console.log("employees: ", employees);

    const updatedPassword = await Promise.all(
      employees.map(async (employee) => {
        const newPassword = generatePassword();
        employee.password = newPassword;
        await employee.save();
      })
    );

    return NextResponse.json(
      { message: "Passwords reset successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error in resetting password" },
      { status: 400 }
    );
  }
};
