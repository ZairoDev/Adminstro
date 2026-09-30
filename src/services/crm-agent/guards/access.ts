import {
  getPilotRoles,
  isCrmAgentEnabled,
  isPilotRole,
  isWriteRole,
} from "@/services/crm-agent/config";
import type { CrmAgentCaller } from "@/services/crm-agent/types";

/** Roles that may use lead lookup tools. */
const LEAD_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
  "Advert",
  "Sales(New)",
  "sales-intern",
  "Subscription-Sales",
  "hSale",
  "HAdmin",
]);

const PROPERTY_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Advert",
  "Sales",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
  "Content",
  "Developer",
]);

const OFFER_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "Agent",
  "Guest",
  "Intern",
  "Subscription-Sales",
  "hSale",
  "HAdmin",
  "Advert",
]);

const VISIT_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "Developer",
]);

const CANDIDATE_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "HR",
  "HAdmin",
  "Developer",
]);

const WHATSAPP_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
  "Advert",
  "sales-intern",
  "Developer",
]);

const FINANCE_LOOKUP_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Developer",
]);

const WRITE_PROPOSE_ROLES = new Set([
  "SuperAdmin",
  "Sales-TeamLead",
  "Sales",
  "HR",
]);

export type ToolName =
  | "findLeadByPhone"
  | "findPropertyByVsid"
  | "findOwnerByPhone"
  | "findOfferByPhone"
  | "getOverdueVisits"
  | "findCandidate"
  | "findEmployee"
  | "explainMyAccess"
  | "searchWhatsApp"
  | "getConversationSummary"
  | "getWhatsAppInboxCounts"
  | "getFinanceTransaction"
  | "getFinanceOverview"
  | "getWebhookLogHint"
  | "getTeamTodayReport"
  | "getDailyLeadStats"
  | "getLeadStatusCounts"
  | "getHiringPipelineSummary"
  | "listMyReminders"
  | "draftText"
  | "proposeWrite";

const TOOL_ROLE_MAP: Record<ToolName, Set<string>> = {
  findLeadByPhone: LEAD_LOOKUP_ROLES,
  findPropertyByVsid: PROPERTY_LOOKUP_ROLES,
  findOwnerByPhone: PROPERTY_LOOKUP_ROLES,
  findOfferByPhone: OFFER_LOOKUP_ROLES,
  getOverdueVisits: VISIT_LOOKUP_ROLES,
  findCandidate: CANDIDATE_LOOKUP_ROLES,
  findEmployee: new Set([
    "SuperAdmin",
    "Admin",
    "HR",
    "HAdmin",
    "Sales-TeamLead",
    "Developer",
  ]),
  explainMyAccess: new Set(["*"]),
  searchWhatsApp: WHATSAPP_LOOKUP_ROLES,
  getConversationSummary: WHATSAPP_LOOKUP_ROLES,
  getWhatsAppInboxCounts: WHATSAPP_LOOKUP_ROLES,
  getFinanceTransaction: FINANCE_LOOKUP_ROLES,
  getFinanceOverview: FINANCE_LOOKUP_ROLES,
  getWebhookLogHint: FINANCE_LOOKUP_ROLES,
  getTeamTodayReport: LEAD_LOOKUP_ROLES,
  getDailyLeadStats: LEAD_LOOKUP_ROLES,
  getLeadStatusCounts: LEAD_LOOKUP_ROLES,
  getHiringPipelineSummary: CANDIDATE_LOOKUP_ROLES,
  listMyReminders: new Set([
    "SuperAdmin",
    "Sales-TeamLead",
    "Sales",
    "HR",
    "LeadGen",
    "LeadGen-TeamLead",
    "Admin",
  ]),
  draftText: new Set(["*"]),
  proposeWrite: WRITE_PROPOSE_ROLES,
};

export function assertAgentAccess(caller: CrmAgentCaller): {
  ok: boolean;
  status: number;
  error?: string;
} {
  if (!isCrmAgentEnabled()) {
    return {
      ok: false,
      status: 403,
      error: "CRM Copilot is disabled (CRM_AGENT_ENABLED).",
    };
  }
  if (!isPilotRole(caller.role)) {
    return {
      ok: false,
      status: 403,
      error: `Role ${caller.role} is not in the CRM Copilot pilot list (${getPilotRoles().join(", ")}).`,
    };
  }
  return { ok: true, status: 200 };
}

export function canUseTool(tool: ToolName, role: string): boolean {
  const allowed = TOOL_ROLE_MAP[tool];
  if (!allowed) return false;
  if (allowed.has("*")) return true;
  if (role === "SuperAdmin" || role === "Developer") return true;
  return allowed.has(role);
}

/** Agent write workflows (disposition / reminders) — pilot write allowlist. */
export function canRunAgentWriteWorkflow(role: string): boolean {
  return isWriteRole(role);
}

export function maskPhone(
  phone: string | null | undefined,
  shouldMask: boolean,
): string {
  if (!phone) return "";
  if (!shouldMask) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export function sanitizeToolData(
  tool: ToolName,
  data: unknown,
  caller: CrmAgentCaller,
): unknown {
  if (data == null || typeof data !== "object") return data;

  const maskGuest = Boolean(caller.whatsappPhoneMask?.maskGuestPhones);
  const maskOwner = Boolean(caller.whatsappPhoneMask?.maskOwnerPhones);
  const shouldMask =
    tool === "searchWhatsApp" || tool === "getConversationSummary"
      ? maskGuest || maskOwner
      : false;

  if (!shouldMask) {
    return stripSensitiveFields(data);
  }

  return deepMaskPhones(stripSensitiveFields(data));
}

function stripSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveFields);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (
        lower.includes("password")
        || lower.includes("mobilepin")
        || lower.includes("mobile_pin")
        || lower === "aadhar"
        || lower === "aadhaar"
        || lower.includes("aadhar")
        || lower.includes("aadhaar")
        || lower === "pan"
        || lower.includes("pannumber")
        || lower.includes("pan_number")
        || lower === "accountno"
        || lower === "accountnumber"
        || lower.includes("accountnumber")
        || lower.includes("accountno")
        || lower === "ifsc"
        || lower.includes("ifsccode")
        || lower.includes("ifsc_code")
        || lower.includes("bankaccount")
        || lower.includes("otp")
        || lower.includes("token")
        || lower.includes("secret")
        || lower.includes("jwt")
      ) {
        continue;
      }
      out[k] = stripSensitiveFields(v);
    }
    return out;
  }
  return value;
}

function deepMaskPhones(value: unknown): unknown {
  if (typeof value === "string") {
    if (/^\+?\d[\d\s\-()]{6,}$/.test(value.trim())) {
      return maskPhone(value, true);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(deepMaskPhones);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase();
      if (lower.includes("phone") || lower === "phoneno" || lower === "wa_id") {
        out[k] = maskPhone(String(v ?? ""), true);
      } else {
        out[k] = deepMaskPhones(v);
      }
    }
    return out;
  }
  return value;
}
