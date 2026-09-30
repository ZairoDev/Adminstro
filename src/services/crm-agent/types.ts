import type { CrmAgentIntent } from "@/models/crmAgentAudit";
import type { CrmAgentMode } from "@/services/crm-agent/workflows/types";
import type {
  ActiveWorkflow,
  CrmAgentUi,
} from "@/services/crm-agent/workflows/types";

export type { CrmAgentIntent, CrmAgentMode };

export interface CrmAgentCaller {
  employeeId: string;
  role: string;
  name?: string;
  allotedArea?: string[] | string | null;
  uiFlags?: {
    hideGuestManagement?: boolean;
    hideOwnerManagement?: boolean;
  };
  whatsappPhoneMask?: {
    maskOwnerPhones?: boolean;
    maskGuestPhones?: boolean;
  };
}

export interface RetrievedChunk {
  id: string;
  sourcePath: string;
  domain: string;
  heading: string;
  content: string;
  score: number;
}

export interface ToolResult {
  name: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  summary?: string;
  deepLinks?: string[];
}

export interface WriteProposal {
  type: "set_reminder" | "suggest_disposition" | "create_personal_reminder";
  title: string;
  description: string;
  payload: Record<string, unknown>;
  confirmApi: string;
}

export interface RunTurnInput {
  message: string;
  conversationId?: string | null;
  caller: CrmAgentCaller;
  callerEmail?: string;
  mode?: CrmAgentMode;
}

export interface RunTurnResult {
  conversationId: string;
  answer: string;
  intent: CrmAgentIntent;
  sources: Array<{ sourcePath: string; heading: string }>;
  toolNames: string[];
  proposal?: WriteProposal | null;
  latencyMs: number;
  activeWorkflow?: ActiveWorkflow | null;
  ui?: CrmAgentUi;
}
