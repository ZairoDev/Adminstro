  import mongoose from "mongoose";

  const invoiceSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String },
      phoneNumber: { type: String },
      address: { type: String }, // billing address of customer

      property: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property", // link to your Property model
      },

      amount: {
        type: Number,
        required: true,
      },

      sgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },

      totalAmount: {
        type: Number,
        required: true, // base amount + taxes
      },

      status: {
        type: String,
        enum: ["paid", "unpaid", "partially_paid", "cancelled"],
        default: "unpaid",
      },

      checkIn: { type: Date },
      checkOut: { type: Date },

      bookingType: {
        type: String,
        enum: ["Booking Commission", "Listing Subscription"],
        default: "Booking Commission",
      },

      companyAddress: {
        type: String, // your office / company's address
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    { timestamps: true }
  );

  const Invoice =
    mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);

  export default Invoice;
