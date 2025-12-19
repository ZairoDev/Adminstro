import mongoose from "mongoose";

export interface ICoupon {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usedCount: number;
  applicablePlans?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new mongoose.Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    discountValue: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0, "Discount value cannot be negative"],
    },
    minPurchaseAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
    },
    validUntil: {
      type: Date,
      required: [true, "Valid until date is required"],
    },
    usageLimit: {
      type: Number,
      default: null,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    applicablePlans: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

couponSchema.methods.isValid = function (
  planId?: string,
  purchaseAmount?: number
): { valid: boolean; message: string } {
  const now = new Date();

  if (!this.isActive) {
    return { valid: false, message: "This coupon is no longer active" };
  }

  if (now < this.validFrom) {
    return { valid: false, message: "This coupon is not yet valid" };
  }

  if (now > this.validUntil) {
    return { valid: false, message: "This coupon has expired" };
  }

  if (this.usageLimit && this.usedCount >= this.usageLimit) {
    return { valid: false, message: "This coupon has reached its usage limit" };
  }

  if (this.applicablePlans && this.applicablePlans.length > 0 && planId) {
    if (!this.applicablePlans.includes(planId)) {
      return {
        valid: false,
        message: "This coupon is not applicable to the selected plan",
      };
    }
  }

  if (
    this.minPurchaseAmount &&
    purchaseAmount &&
    purchaseAmount < this.minPurchaseAmount
  ) {
    return {
      valid: false,
      message: `Minimum purchase amount of €${this.minPurchaseAmount} required`,
    };
  }

  return { valid: true, message: "Coupon is valid" };
};

couponSchema.methods.calculateDiscount = function (amount: number): number {
  let discount = 0;

  if (this.discountType === "percentage") {
    discount = (amount * this.discountValue) / 100;
    if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
      discount = this.maxDiscountAmount;
    }
  } else {
    discount = this.discountValue;
  }

  return Math.min(discount, amount);
};

const Coupon =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", couponSchema);

export default Coupon;
