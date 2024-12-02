import Employees from "@/models/employee";
import { sendEmail } from "@/util/mailer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const referer = request.headers.get("referer");
  const email = referer?.split("otp/")[1] ?? "";
  console.log(email);
  try {
    const user = await Employees.find({ email });
    console.log(user);
    const response = await sendEmail({
      email,
      emailType: "OTP",
      userId: user[0]._id,
    });

    console.log(response);
    
    return NextResponse.json({ message: "OTP sent" }, { status: 200 });
  } catch (err: any) {
    
    console.log(err);
    
    NextResponse.json({ error: "OTP not sent" }, { status: 400 });
  }
}
