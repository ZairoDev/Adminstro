import { bookingValidationSchema } from "@/schemas/booking.schema";
import mongoose from "mongoose";
import { Schema } from "mongoose";

const bookingSchema = new Schema<bookingValidationSchema>(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Query",
      required: true,
    },
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Visits",
      required: true,
    },
    checkIn: {
      date: {
        type: Date,
        required: true,
      },
      time: {
        type: String,
        required: true,
      },
    },
    checkOut: {
      date: {
        type: Date,
        required: true,
      },
      time: {
        type: String,
        required: true,
      },
    },
    paymentStatus: {
      type: String,
      required: true,
    },
    contract: {
      type: String,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    ownerPayment: {
      finalAmount: {
        type: Number,
        required: true,
      },
      amountRecieved: {
        type: Number,
        required: true,
      },
    },
    travellerAmount: {
      finalAmount: {
        type: Number,
        required: true,
      },
      amountRecieved: {
        type: Number,
        required: true,
      },
    },
    payment: {
      orderId: {
        type: String,
        required: true,
      },
      paymentId: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "partial"],
        default: "pending",
        required: true,
      },
      remainingAmount: {
        type: Number,
        required: true,
      },
      paidAt: {
        type: Date,
        required: true,
      },
    },
    note: {
      type: String,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

const Bookings =
  mongoose.models?.bookings || mongoose.model("bookings", bookingSchema);
export default Bookings;
