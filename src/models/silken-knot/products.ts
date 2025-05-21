import mongoose, { Schema, Document } from "mongoose";

const productSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category" },
  // tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
  tags: { type: [String] },
  image: { type: [String] }, // Storing URL instead of file
  refundPolicy: {
    type: String,
    enum: ["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"],
    default: "30-day",
  },
});

export const Products =
  mongoose.models.Products || mongoose.model("Products", productSchema);
