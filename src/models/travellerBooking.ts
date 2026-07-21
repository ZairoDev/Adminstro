import mongoose, { Schema } from "mongoose";

/**
 * Shared with the mobile Backend collection `travellerBookings`.
 * Do not invent a parallel schema — this must stay aligned with
 * VS-app-backend `models/TravellerBooking.ts`.
 */

const travellerSubSchema = new Schema(
  {
    name: { type: String, required: true },
    age: { type: String, required: true },
    gender: { type: String, required: true },
    nationality: { type: String, required: true },
    type: {
      type: String,
      enum: ["adult", "child", "infant"],
      required: true,
    },
  },
  { _id: true },
);

const travellerBookingSchema = new Schema(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "properties",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    travellerId: {
      type: Schema.Types.ObjectId,
      ref: "travellers",
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    guests: {
      adults: { type: Number, required: true },
      children: { type: Number, required: true },
      infants: { type: Number, required: true },
    },
    travellers: [travellerSubSchema],
    totalNights: { type: Number, required: true },
    price: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "refunded"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["confirmed", "pending", "cancelled"],
      default: "pending",
    },
    payment: {
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
      paidAt: { type: Date },
    },
    notes: { type: String },
  },
  { timestamps: true, collection: "travellerBookings" },
);

travellerBookingSchema.index({ createdAt: -1 });
travellerBookingSchema.index({ bookingStatus: 1, createdAt: -1 });

const TravellerBookings =
  mongoose.models.travellerBookings ||
  mongoose.model("travellerBookings", travellerBookingSchema);

export default TravellerBookings;
