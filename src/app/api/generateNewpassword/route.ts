import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { computePasswordExpiryDate } from "@/util/passwordExpiry";
import { getDataFromToken } from "@/util/getDataFromToken";
// import { sendEmail } from "@/util/mailer";

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
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		await getDataFromToken(request);
		const reqBody = await request.json();
		const { employeeId } = reqBody;
		const employee = await Employees.findById(employeeId);
		if (!employee) {
			return NextResponse.json(
				{ error: "Employee not found" },
				{ status: 404 }
			);
		}
    // Do not allow password changes for HAdmin role or protected emails
    if (employee.role === "HAdmin") {
      return NextResponse.json(
        { error: "Password change is not allowed for this employee" },
        { status: 403 }
      );
    }
		const newPassword = generatePassword();
		// const hashedPassword = await bcryptjs.hash(newPassword, 10);

		employee.password = newPassword;
		employee.passwordExpiresAt = computePasswordExpiryDate();
		await employee.save();

		// Send email with new password
		// await sendEmail({
		//   email: employee.email,
		//   emailType: "NEWPASSWORD",
		//   userId: employee._id,
		//   newPassword: newPassword,
		// });

		return NextResponse.json(
			{
				message: "New password generated and sent to employee",
				newPassword: newPassword,
			},
			{ status: 200 }
		);
	} catch (err: unknown) {
		const error = err as { status?: number; code?: string; message?: string };
		if (error?.status) {
			return NextResponse.json(
				{ code: error.code || "AUTH_FAILED" },
				{ status: error.status },
			);
		}
		console.error(err);
		return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
	}
}
