import mongoose, { Schema } from "mongoose";

/* ------------------------- COUNTER ------------------------- */
const counterSchema = new Schema({
  id: { type: String, required: true },
  seq: { type: Number, default: 1880 },
});

const Counter =
  mongoose.models?.counters || mongoose.model("counters", counterSchema);

/* ------------------------- BOOKING SCHEMA ------------------------- */
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

    address: { type: String },
    propertyName: { type: String },

    /* ------------------- Traveller Payment ------------------- */
    travellerPayment: {
      finalAmount: { type: Number, required: true }, // Total due from traveller(s)
      amountReceived: { type: Number, default: 0 },
      paymentType: {
        type: String,
        enum: ["full", "partial", "split"],
        default: "full",
      },
      status: {
        type: String,
        enum: ["pending", "partial", "paid"],
        default: "pending",
      },
      rentPayable:{type: Number},
      depositPaid:{type: Number},

      // Guest list for split or full payments
      guests: [
        {
          name: { type: String },                
          email: { type: String },
          phone: { type: String },
          amountDue: { type: Number },
          amountPaid: { type: Number, default: 0 },
          paymentLink: { type: String },
          status: {
            type: String,
            enum: ["pending", "partial", "paid"],
            default: "pending",
          },
          documents: [String],          


                        
          payments: [
            {
              amount: { type: Number },
              date: { type: Date, default: Date.now },
              method: { type: String },
              linkId: { type: String },
              paymentId: { type: String },
              status: {
                type: String,
                enum: ["paid", "pending", "failed"],
                default: "pending",
              },
            },
          ],
        },
      ],

      // Overall history for all payments
      history: [
        {
          amount: { type: Number },
          date: { type: Date, default: Date.now },
          method: { type: String },
          paidBy: { type: String },
          linkId: { type: String },
          paymentId: { type: String },
          status: {
            type: String,
            enum: ["paid", "pending", "failed"],
            default: "pending",
          },
        },
      ],
    },

    /* ------------------- Owner Payment ------------------- */
    ownerPayment: {
      totalAmount: { type: Number }, // Amount to owner
      amountReceived: { type: Number, default: 0 }, // Amount owner has received
      status: {
        type: String,
        enum: ["pending", "partial", "paid"],
        default: "pending",
      },
      payments: [
        {
          amount: { type: Number },
          date: { type: Date, default: Date.now },
          method: { type: String },
          paymentId: { type: String },
          status: {
            type: String,
            enum: ["paid", "pending", "failed"],
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

/* ------------------------- AUTO INCREMENT BOOKING ID ------------------------- */
bookingSchema.pre("save", async function (next) {
  // --- Auto increment bookingId ---
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { id: "bookingId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.bookingId = `BI-${counter.seq}`;
  }

  /* ---------------- SPLIT PAYMENT CALCULATION ---------------- */
  if (
    this.travellerPayment?.paymentType === "split" &&
    this.travellerPayment.guests?.length > 0
  ) {
    const perGuest =
      this.travellerPayment.finalAmount / this.travellerPayment.guests.length;

    this.travellerPayment.guests.forEach((guest) => {
      if (guest.amountDue == null) guest.amountDue = perGuest;
    });
  }

  /* ---------------- TRAVELLER PAYMENT STATUS BASED ON HISTORY ---------------- */
  if (this.travellerPayment) {
    const history = this.travellerPayment.history || [];
    console.log("history: ", history);  

    // 1️⃣ Group payments by guest phone/email/name (or any unique identifier)
    const guestPayments: Record<string, number> = {};

    for (const entry of history) {
      if (entry.status === "paid") {
        const key = entry.paidBy?.toLowerCase().trim();
        if (key)
          guestPayments[key] = (guestPayments[key] || 0) + (entry.amount || 0);
      }
    }

    // 2️⃣ Update each guest’s amountPaid + status based on history
    let totalPaid = 0;
    this.travellerPayment.guests.forEach((guest: any) => {
      const key = guest.paidBy?.toLowerCase().trim();
      const paid = guestPayments[key] || 0;
      guest.amountPaid = paid;
      totalPaid += paid;

      if (paid === 0) guest.status = "pending";
      else if (paid < (guest.amountDue || 0)) guest.status = "partial";
      else guest.status = "paid";
    });

    // 3️⃣ Update overall travellerPayment totals
    this.travellerPayment.amountReceived = totalPaid;

    if (totalPaid === 0) this.travellerPayment.status = "pending";
    else if (totalPaid < (this.travellerPayment.finalAmount || 0))
      this.travellerPayment.status = "partial";
    else this.travellerPayment.status = "paid";
  }

  /* ---------------- OWNER PAYMENT STATUS ---------------- */
  if (this.ownerPayment) {
    const ownerPaid = this.ownerPayment.amountReceived ?? 0;
    const ownerTotal = this.ownerPayment.totalAmount ?? 0;

    if (ownerPaid === 0) this.ownerPayment.status = "pending";
    else if (ownerPaid < ownerTotal) this.ownerPayment.status = "partial";
    else this.ownerPayment.status = "paid";
  }

  next();
});


/* ------------------------- MODEL EXPORT ------------------------- */
const Bookings =
  mongoose.models?.bookings || mongoose.model("bookings", bookingSchema);

export default Bookings;
