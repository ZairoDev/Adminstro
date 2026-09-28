import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CrmAgentIntent =
  | "how_to"
  | "lookup"
  | "summarize"
  | "draft"
  | "propose_write"
  | "refuse";

export interface ICrmAgentAudit extends Document {
  actorId: Types.ObjectId;
  role: string;
  conversationId?: Types.ObjectId | null;
  question: string;
  intent: CrmAgentIntent;
  chunkIds: string[];
  toolCalls: Array<{
    name: string;
    ok: boolean;
    summary?: string;
  }>;
  latencyMs: number;
  refused: boolean;
  refuseReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const crmAgentAuditSchema = new Schema<ICrmAgentAudit>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
      index: true,
    },
    role: { type: String, required: true, index: true },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "CrmAgentConversation",
      default: null,
    },
    question: { type: String, required: true, maxlength: 4000 },
    intent: {
      type: String,
      enum: ["how_to", "lookup", "summarize", "draft", "propose_write", "refuse"],
      required: true,
      index: true,
    },
    chunkIds: [{ type: String }],
    toolCalls: [
      {
        name: { type: String, required: true },
        ok: { type: Boolean, required: true },
        summary: { type: String },
      },
    ],
    latencyMs: { type: Number, required: true },
    refused: { type: Boolean, default: false },
    refuseReason: { type: String, default: null },
  },
  { timestamps: true },
);

crmAgentAuditSchema.index({ createdAt: -1 });

const CrmAgentAudit: Model<ICrmAgentAudit> =
  mongoose.models.CrmAgentAudit ||
  mongoose.model<ICrmAgentAudit>("CrmAgentAudit", crmAgentAuditSchema);

export default CrmAgentAudit;
