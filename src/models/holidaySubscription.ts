import mongoose from "mongoose";

export interface ISubscription {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  planId: string;
  planName: string;
  duration: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  status: "pending" | "active" | "expired" | "cancelled";
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new mongoose.Schema<ISubscription>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: [true, "User ID is required"],
    },
    userEmail: {
      type: String,
      required: [true, "User email is required"],
    },
    planId: {
      type: String,
      required: [true, "Plan ID is required"],
    },
    planName: {
      type: String,
      required: [true, "Plan name is required"],
    },
    duration: {
      type: String,
      required: [true, "Duration is required"],
    },
    originalAmount: {
      type: Number,
      required: [true, "Original amount is required"],
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    finalAmount: {
      type: Number,
      required: [true, "Final amount is required"],
    },
    couponCode: {
      type: String,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      required: [true, "Razorpay order ID is required"],
    },
    razorpayPaymentId: {
      type: String,
      required: [true, "Razorpay payment ID is required"],
    },
    razorpaySignature: {
      type: String,
      required: [true, "Razorpay signature is required"],
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookups
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ razorpayPaymentId: 1 });

const Subscription =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", subscriptionSchema);

export default Subscription;
