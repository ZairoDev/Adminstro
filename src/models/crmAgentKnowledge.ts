import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICrmAgentKnowledge extends Document {
  sourcePath: string;
  domain: string;
  heading: string;
  content: string;
  embedding: number[];
  contentHash: string;
  updatedAt: Date;
  createdAt: Date;
}

const crmAgentKnowledgeSchema = new Schema<ICrmAgentKnowledge>(
  {
    sourcePath: { type: String, required: true, index: true },
    domain: { type: String, required: true, index: true },
    heading: { type: String, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true, default: [] },
    contentHash: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

crmAgentKnowledgeSchema.index(
  { sourcePath: 1, heading: 1 },
  { unique: true },
);

const CrmAgentKnowledge: Model<ICrmAgentKnowledge> =
  mongoose.models.CrmAgentKnowledge ||
  mongoose.model<ICrmAgentKnowledge>(
    "CrmAgentKnowledge",
    crmAgentKnowledgeSchema,
  );

export default CrmAgentKnowledge;
