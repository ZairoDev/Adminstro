import Employees from "@/models/employee";
import { sendEmail } from "@/util/mailer";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";

export async function POST(request: NextRequest) {
  try {
    await connectDb();

    const referer = request.headers.get("referer");
    const refererEmail = referer?.includes("otp/") ? referer.split("otp/")[1] : undefined;

    let reqBody: any = {};
    try {
      reqBody = await request.json();
    } catch {
      // body may be empty
    }

    const rawEmailField = reqBody?.email;
    const rawEmail = Array.isArray(rawEmailField)
      ? rawEmailField.map((s: string) => decodeURIComponent(s)).join("").trim()
      : (rawEmailField ?? refererEmail);
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await Employees.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }

    await sendEmail({
      email: (user as any).email,
      emailType: "OTP",
      userId: (user as any)._id,
    });

    return NextResponse.json({ message: "OTP sent" }, { status: 200 });
  } catch (err: any) {
    console.log(err);
    return NextResponse.json({ error: "OTP not sent" }, { status: 400 });
  }
}
