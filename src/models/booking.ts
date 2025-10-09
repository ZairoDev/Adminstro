import mongoose, { Schema } from "mongoose";

// Counter schema for auto-increment bookingId
const counterSchema = new Schema({
  id: { type: String, required: true },
  seq: { type: Number, default: 1880 },
});

const Counter =
  mongoose.models?.counters || mongoose.model("counters", counterSchema);

const bookingSchema = new Schema(
  {
    bookingId: { type: String, unique: true },

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Query",
      required: true,
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "visits",
      required: true,
    },
    checkIn: {
      date: { type: Date, required: true },
      time: { type: String, required: true },
    },
    checkOut: {
      date: { type: Date, required: true },
      time: { type: String, required: true },
    },

    contract: { type: String },
    leadClosingBy: { type: String },

    finalAmount: { type: Number, required: true }, // Overall booking total

    // Owner settlement
    ownerPayment: {
      finalAmount: { type: Number, required: true },
      amountRecieved: { type: Number, default: 0 },
    },

    // Traveller payment (Razorpay + partial payments)
    travellerPayment: {
      finalAmount: { type: Number, required: true }, // Total due for traveller
      amountRecieved: { type: Number, default: 0 }, // sum of all successful payments
      status: {
        type: String,
        enum: ["pending", "partial", "paid", "failed"],
        default: "pending",
      },
      currency: { type: String },
      method: { type: String },
      paidAt: { type: Date },
      customerEmail: { type: String },
      customerPhone: { type: String },
      orderId: { type: String }, // Razorpay order/payment link id
      paymentId: { type: String }, // Razorpay payment id

      // Store each partial payment
      history: [
        {
          amount: { type: Number, required: true },
          date: { type: Date, default: Date.now },
          method: { type: String },
          linkId: { type: String }, // Razorpay link id
          paymentId: { type: String }, // Razorpay payment id
          status: {
            type: String,
            enum: ["paid", "failed", "pending"],
            default: "pending",
          },
        },
      ],
    },

    note: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Auto-increment bookingId
bookingSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: "bookingId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.bookingId = `BI-${counter.seq}`;
  }
  next();
});

// Auto-calculate remaining amount and status before save
bookingSchema.pre("save", function (next) {
  if (this.travellerPayment) {
    const total = this.travellerPayment.finalAmount || 0;
    const paid = this.travellerPayment.amountRecieved || 0;
    this.travellerPayment.status =
      paid === 0 ? "pending" : paid < total ? "partial" : "paid";
  }
  next();
});

const Bookings =
  mongoose.models?.bookings || mongoose.model("bookings", bookingSchema);

export default Bookings;
