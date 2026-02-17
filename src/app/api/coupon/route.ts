import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Coupon from "@/models/coupon";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

connectDb();

// GET all coupons
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const currentPage = Number(searchParams.get("currentPage")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // active, inactive, expired, all

    const query: any = {};

    if (search) {
      query.code = new RegExp(search, "i");
    }

    const now = new Date();

    if (status === "active") {
      query.isActive = true;
      query.validUntil = { $gte: now };
      query.validFrom = { $lte: now };
    } else if (status === "inactive") {
      query.isActive = false;
    } else if (status === "expired") {
      query.validUntil = { $lt: now };
    }

    const skip = (currentPage - 1) * limit;

    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCoupons = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(totalCoupons / limit);

    return NextResponse.json({
      success: true,
      coupons,
      totalCoupons,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

// POST - Create new coupon
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
      originValue,
    } = body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (existingCoupon) {
      return NextResponse.json(
        { success: false, message: "Coupon code already exists" },
        { status: 400 }
      );
    }

    const newCoupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      discountValue,
      minPurchaseAmount: minPurchaseAmount || 0,
      maxDiscountAmount: maxDiscountAmount || null,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      usageLimit: usageLimit || null,
      applicablePlans: applicablePlans || [],
      isActive: isActive !== undefined ? isActive : true,
      usedCount: 0,
      origin: originValue,
    });

    await newCoupon.save();

    return NextResponse.json({
      success: true,
      message: "Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (error: any) {
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to create coupon",
      },
      { status: 500 }
    );
  }
}
