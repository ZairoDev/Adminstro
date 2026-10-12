import mongoose, { Schema, type Model } from "mongoose";

interface IFinanceCounter {
  id: string;
  seq: number;
}

const financeCounterSchema = new Schema<IFinanceCounter>({
  id: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const FinanceCounter: Model<IFinanceCounter> =
  (mongoose.models?.FinanceCounter as Model<IFinanceCounter>) ??
  mongoose.model<IFinanceCounter>("FinanceCounter", financeCounterSchema);

/**
 * Atomically increment and return the next finance invoice number.
 * Returns a string like "FIN-00001".
 * Race-safe — uses MongoDB findOneAndUpdate with $inc.
 */
export async function getNextFinanceInvoiceNumber(): Promise<string> {
  const counter = await FinanceCounter.findOneAndUpdate(
    { id: "financeInvoice" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  const padded = String(counter.seq).padStart(5, "0");
  return `FIN-${padded}`;
}
