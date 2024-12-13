import { NextRequest, NextResponse } from "next/server";
import bcryptjs from "bcryptjs";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
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
		const reqBody = await request.json();
		const { employeeId } = reqBody;
		const employee = await Employees.findById(employeeId);
		if (!employee) {
			return NextResponse.json(
				{ error: "Employee not found" },
				{ status: 404 }
			);
		}
		const newPassword = generatePassword();
		// const hashedPassword = await bcryptjs.hash(newPassword, 10);

		employee.password = newPassword;
		employee.passwordExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
	} catch (error: any) {
		console.error(error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
