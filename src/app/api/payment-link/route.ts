import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const { amount, name, email, phone, description } = await req.json();

    // console.log("Received payment link request:", { amount, name, email, phone, description });

    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      accept_partial: false,
      description: description || "Payment for service",
      customer: { name:name, email:email, contact: phone },
      notify: { sms: true, email: true },
      reminder_enable: true,
      notes: { type: "Invoice Payment" },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success`,
      callback_method: "get",
      expire_by: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60, // 10 years
    });

    return NextResponse.json({ success: true, paymentLink });
  } catch (error: any) {
    console.error("Razorpay Payment Link Error:", error);
    return NextResponse.json(
      { success: false, error: error.error?.description || error.message },
      { status: 500 }
    );
  }
}
