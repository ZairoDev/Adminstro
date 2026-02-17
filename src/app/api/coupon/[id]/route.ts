import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Coupon from "@/models/coupon";

export const dynamic = "force-dynamic";

connectDb();

// GET single coupon by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    const coupon = await Coupon.findById(id);

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch coupon" },
      { status: 500 }
    );
  }
}

// PUT - Update coupon
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    const body = await request.json();

    const {
      code,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      validFrom,
      validUntil,
      usageLimit,
      applicablePlans,
      isActive,
    } = body;

    // Check if updating to a code that already exists (excluding current coupon)
    if (code) {
      const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
        _id: { $ne: id },
      });

      if (existingCoupon) {
        return NextResponse.json(
          { success: false, message: "Coupon code already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};

    if (code) updateData.code = code.toUpperCase();
    if (discountType) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = discountValue;
    if (minPurchaseAmount !== undefined)
      updateData.minPurchaseAmount = minPurchaseAmount;
    if (maxDiscountAmount !== undefined)
      updateData.maxDiscountAmount = maxDiscountAmount;
    if (validFrom) updateData.validFrom = new Date(validFrom);
    if (validUntil) updateData.validUntil = new Date(validUntil);
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit;
    if (applicablePlans !== undefined)
      updateData.applicablePlans = applicablePlans;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (body.origin !== undefined) updateData.origin = body.origin;

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Coupon updated successfully",
      coupon: updatedCoupon,
    });
  } catch (error: any) {
    console.error("Error updating coupon:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update coupon",
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete coupon
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
