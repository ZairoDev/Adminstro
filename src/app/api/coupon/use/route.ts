import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Coupon from "@/models/coupon";

export const dynamic = "force-dynamic";

connectDb();

// POST - Increment usage count of a coupon
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: "Coupon code is required" },
        { status: 400 }
      );
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Invalid coupon code" },
        { status: 404 }
      );
    }

    // Check if usage limit reached
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { success: false, message: "This coupon has reached its usage limit" },
        { status: 400 }
      );
    }

    // Increment usage count
    coupon.usedCount += 1;
    await coupon.save();

    return NextResponse.json({
      success: true,
      message: "Coupon usage recorded successfully",
      usedCount: coupon.usedCount,
      usageLimit: coupon.usageLimit,
    });
  } catch (error) {
    console.error("Error recording coupon usage:", error);
    return NextResponse.json(
      { success: false, message: "Failed to record coupon usage" },
      { status: 500 }
    );
  }
}
