import mongoose from "mongoose";

const WebsiteLeadNoteSchema = new mongoose.Schema(
  {
    noteData: { type: String, required: true },
    createdBy: { type: String, required: true },
    createOn: { type: String, required: true },
  },
  { _id: false }
);

const WebsiteLeadsSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    telephone: { type: String, required: true },
    VSID: { type: String, required: true },
    email: { type: String },
    message: { type: String, required: true },
    note: { type: [WebsiteLeadNoteSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.WebsiteLeads ||
  mongoose.model("WebsiteLeads", WebsiteLeadsSchema);