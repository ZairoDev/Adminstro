import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  color: { type: String },
  parent: { type: Schema.Types.ObjectId, ref: "Categories" },
  subcategories: [{ type: Schema.Types.ObjectId, ref: "Categories" }],
});

export const Categories =
  mongoose.models.Categories || mongoose.model("Categories", categorySchema);
