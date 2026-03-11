import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { generatePassword } from "@/util/generatePassword";
import { computePasswordExpiryDate } from "@/util/passwordExpiry";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export const GET = async (req: NextRequest) => {
  try {
    const authUser = await getDataFromToken(req);
    if (authUser.role !== "SuperAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const excludedRoles = ["SuperAdmin", "Developer", "HR", "Content", "HAdmin"];
    const excludedEmails = ["khanshahid5880@gmail.com"];

    const employees = await Employees.find({
      role: { $nin: excludedRoles },
      email: { $nin: excludedEmails },
    });

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
          const newPassword = generatePassword(6);
          employee.password = newPassword;
          employee.passwordExpiresAt = computePasswordExpiryDate();
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
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "Error in resetting password" },
      { status: 500 }
    );
  }
};
