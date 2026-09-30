import mongoose, { Schema, Document, Model, Types } from "mongoose";

export const CRM_AGENT_INTENTS = [
  "how_to",
  "lookup",
  "report",
  "summarize",
  "draft",
  "propose_write",
  "refuse",
] as const;

export type CrmAgentIntent = (typeof CRM_AGENT_INTENTS)[number];

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
      enum: [...CRM_AGENT_INTENTS],
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

/**
 * Next.js HMR reuses mongoose.models.* with the first-registered schema.
 * When we add enum values (e.g. `report`), refresh the model so validation matches source.
 */
function getCrmAgentAuditModel(): Model<ICrmAgentAudit> {
  const existing = mongoose.models.CrmAgentAudit as
    | Model<ICrmAgentAudit>
    | undefined;

  if (existing) {
    const intentPath = existing.schema.path("intent") as
      | (mongoose.SchemaType & { enumValues?: string[] })
      | undefined;
    const current = intentPath?.enumValues ?? [];
    const needsRefresh = CRM_AGENT_INTENTS.some((v) => !current.includes(v));

    if (!needsRefresh) return existing;

    // Drop stale compiled model so the updated schema (with `report`) registers.
    delete mongoose.models.CrmAgentAudit;
    const schemas = (
      mongoose as unknown as { modelSchemas?: Record<string, unknown> }
    ).modelSchemas;
    if (schemas?.CrmAgentAudit) delete schemas.CrmAgentAudit;
  }

  return mongoose.model<ICrmAgentAudit>("CrmAgentAudit", crmAgentAuditSchema);
}

const CrmAgentAudit: Model<ICrmAgentAudit> = getCrmAgentAuditModel();

export default CrmAgentAudit;
