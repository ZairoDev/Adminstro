import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    address: { type: String },

    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },

    bookingId: {
      type: String,
      index: true,
    },

    invoiceNumber: {
      // ⬅ renamed from invoiceNo
      type: String,
      required: true,
      unique: true, // make sure it matches DB index
    },
    nationality: { type: String },
    amount: { type: Number },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },

    totalAmount: { type: Number },
    sacCode: { type: Number },

    status: {
      type: String,
      enum: ["paid", "unpaid", "partially_paid", "cancelled"],
      default: "unpaid",
    },

    checkIn: { type: Date },
    checkOut: { type: Date },
    date: { type: Date },

    bookingType: {
      type: String,
      enum: ["Booking Commission", "Listing Subscription"],
      default: "Booking Commission",
    },

    companyAddress: { type: String },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Invoice =
  mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);

export default Invoice;
