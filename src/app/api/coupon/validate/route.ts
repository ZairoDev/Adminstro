import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Coupon from "@/models/coupon";

export const dynamic = "force-dynamic";

connectDb();

// POST - Validate a coupon code
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { code, planId, purchaseAmount } = body;

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

    // Check validity
    const now = new Date();

    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, message: "This coupon is no longer active" },
        { status: 400 }
      );
    }

    if (now < coupon.validFrom) {
      return NextResponse.json(
        { success: false, message: "This coupon is not yet valid" },
        { status: 400 }
      );
    }

    if (now > coupon.validUntil) {
      return NextResponse.json(
        { success: false, message: "This coupon has expired" },
        { status: 400 }
      );
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json(
        { success: false, message: "This coupon has reached its usage limit" },
        { status: 400 }
      );
    }

    if (
      coupon.applicablePlans &&
      coupon.applicablePlans.length > 0 &&
      planId
    ) {
      if (!coupon.applicablePlans.includes(planId)) {
        return NextResponse.json(
          {
            success: false,
            message: "This coupon is not applicable to the selected plan",
          },
          { status: 400 }
        );
      }
    }

    if (
      coupon.minPurchaseAmount &&
      purchaseAmount &&
      purchaseAmount < coupon.minPurchaseAmount
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum purchase amount of €${coupon.minPurchaseAmount} required`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    if (purchaseAmount) {
      if (coupon.discountType === "percentage") {
        discount = (purchaseAmount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
          discount = coupon.maxDiscountAmount;
        }
      } else {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, purchaseAmount);
    }

    return NextResponse.json({
      success: true,
      message: "Coupon is valid",
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
      },
      discount,
      finalAmount: purchaseAmount ? purchaseAmount - discount : null,
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json(
      { success: false, message: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
