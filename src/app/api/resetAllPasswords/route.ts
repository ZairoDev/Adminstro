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

    // const updatedPassword = await Promise.all(
    //   employees.map(async (employee) => {
    //     const newPassword = generatePassword();
    //     employee.password = newPassword;
    //     employee.passwordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    //     await employee.save();
    //   })
    // );

    const updatedPassword = await Promise.all(
      employees.map(async (employee) => {
        try {
          const newPassword = generatePassword();
          employee.password = newPassword;
          employee.passwordExpiresAt = new Date(
            Date.now() + 24 * 60 * 60 * 1000
          );
          await employee.save();
          return true;
        } catch (error) {
          console.error(`Error updating employee ${employee.email}:`, error);
          return false;
        }
      })
    );

    const successCount = updatedPassword.filter(Boolean).length;

    return NextResponse.json(
      {
        message: "Passwords reset successfully",
        updatedEmployees: successCount,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error in resetting password" },
      { status: 400 }
    );
  }
};
