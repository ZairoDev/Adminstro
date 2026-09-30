import mongoose, { Schema, Document, Model, Types } from "mongoose";
import type { ActiveWorkflow } from "@/services/crm-agent/workflows/types";

export type CrmAgentMessageRole = "user" | "assistant" | "system";

export interface ICrmAgentMessage {
  role: CrmAgentMessageRole;
  content: string;
  sources?: Array<{ sourcePath: string; heading: string }>;
  toolNames?: string[];
  createdAt: Date;
}

export interface ICrmAgentConversation extends Document {
  employeeId: Types.ObjectId;
  title: string;
  messages: ICrmAgentMessage[];
  activeWorkflow?: ActiveWorkflow | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<ICrmAgentMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    sources: [
      {
        sourcePath: String,
        heading: String,
      },
    ],
    toolNames: [{ type: String }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const crmAgentConversationSchema = new Schema<ICrmAgentConversation>(
  {
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
      index: true,
    },
    title: { type: String, default: "Nova" },
    messages: { type: [messageSchema], default: [] },
    activeWorkflow: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

const CrmAgentConversation: Model<ICrmAgentConversation> =
  mongoose.models.CrmAgentConversation ||
  mongoose.model<ICrmAgentConversation>(
    "CrmAgentConversation",
    crmAgentConversationSchema,
  );

export default CrmAgentConversation;
