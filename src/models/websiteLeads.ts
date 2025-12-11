import mongoose from "mongoose";

const WebsiteLeadsSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    telephone: { type: String, required: true },
    VSID: { type: String, required: true },
    email: { type: String },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.WebsiteLeads ||
  mongoose.model("WebsiteLeads", WebsiteLeadsSchema);