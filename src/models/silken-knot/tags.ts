import mongoose, { Schema, Document } from "mongoose";

const tagSchema = new Schema({
  name: { type: String, required: true, unique: true },
  products: [{ type: Schema.Types.ObjectId, ref: "Product" }],
});

export const Tags = mongoose.models.Tags || mongoose.model("Tags", tagSchema);
