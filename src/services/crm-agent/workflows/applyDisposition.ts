import mongoose from "mongoose";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import {
  LEAD_QUALITY_BY_REVIEWER_OPTIONS,
  assertValidDispositionTransition,
  formatLeadStatusLabel,
  normalizeLeadStatus,
  primaryDispositionActionsForLeadStatus,
  type CoreWhatsAppDispositionAction,
} from "@/lib/leads/leadDisposition";
import {
  LEAD_DECLINE_REASONS,
  LEAD_REJECTION_REASONS,
} from "@/lib/leads/dispositionReasons";
import { describeDispositionPlan } from "@/services/leads/applyLeadDisposition";
import type {
  ActiveWorkflow,
  DispositionAction,
  WorkflowStepResult,
} from "@/services/crm-agent/workflows/types";

const PHONE_RE = /(?:\+?\d[\d\s\-()]{7,}\d)/;

function nowIso(): string {
  return new Date().toISOString();
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function findLeadForWorkflow(params: {
  phone?: string;
  leadId?: string;
}): Promise<{
  leadId: string;
  name: string;
  phoneNo: string;
  leadStatus: string;
} | null> {
  await connectDb();
  if (params.leadId && mongoose.Types.ObjectId.isValid(params.leadId)) {
    const lead = (await Query.findById(params.leadId)
      .select("_id name phoneNo leadStatus")
      .lean()) as {
      _id: unknown;
      name?: string;
      phoneNo?: string;
      leadStatus?: string;
    } | null;
    if (!lead) return null;
    return {
      leadId: String(lead._id),
      name: String(lead.name ?? ""),
      phoneNo: String(lead.phoneNo ?? ""),
      leadStatus: normalizeLeadStatus(lead.leadStatus),
    };
  }
  if (params.phone) {
    const digits = params.phone.replace(/\D/g, "").slice(-10) || params.phone;
    const lead = (await Query.findOne({
      phoneNo: { $regex: digits, $options: "i" },
    })
      .select("_id name phoneNo leadStatus")
      .lean()) as {
      _id: unknown;
      name?: string;
      phoneNo?: string;
      leadStatus?: string;
    } | null;
    if (!lead) return null;
    return {
      leadId: String(lead._id),
      name: String(lead.name ?? ""),
      phoneNo: String(lead.phoneNo ?? ""),
      leadStatus: normalizeLeadStatus(lead.leadStatus),
    };
  }
  return null;
}

export function detectDispositionAction(
  message: string,
): DispositionAction | null {
  const lower = message.toLowerCase();
  if (/good\s*to\s*go|good-to-go|\bgtg\b/.test(lower)) return "good_to_go";
  if (/\bdecline\b/.test(lower)) return "decline_lead";
  if (/\breject\b/.test(lower)) return "reject_lead";
  return null;
}

export function looksLikeDispositionIntent(message: string): boolean {
  return detectDispositionAction(message) !== null
    || /\bmove\s+(this\s+)?lead\b/i.test(message)
    || /\bmark\s+(as\s+)?(good|reject|decline)/i.test(message);
}

export function startDispositionWorkflow(
  message: string,
): ActiveWorkflow {
  const action = detectDispositionAction(message);
  const phoneMatch = message.match(PHONE_RE);
  const phone = phoneMatch?.[0]?.replace(/[\s\-()]/g, "");
  const slots: Record<string, unknown> = {};
  if (action) slots.action = action;
  if (phone) slots.phone = phone;

  const missing: string[] = [];
  if (!phone) missing.push("phone");
  if (!action) missing.push("action");
  // quality/reason after lead resolved

  return {
    workflowId: "apply_disposition",
    status: "collecting",
    slots,
    missing: missing.length ? missing : ["resolve_lead"],
    startedAt: nowIso(),
  };
}

export async function advanceDispositionWorkflow(
  workflow: ActiveWorkflow,
  userMessage: string,
): Promise<WorkflowStepResult> {
  const msg = userMessage.trim();
  const lower = msg.toLowerCase();

  if (lower === "cancel" || lower === "stop") {
    return {
      answer: "Cancelled the disposition workflow.",
      activeWorkflow: null,
      done: true,
    };
  }

  const slots = { ...workflow.slots };

  // Choice values: action:..., quality:..., reason:...
  if (msg.startsWith("action:")) {
    slots.action = msg.slice("action:".length) as DispositionAction;
  } else if (msg.startsWith("quality:")) {
    slots.leadQualityByReviewer = msg.slice("quality:".length);
  } else if (msg.startsWith("reason:")) {
    slots.reason = msg.slice("reason:".length);
  } else if (!slots.phone && !slots.leadId) {
    const phoneMatch = msg.match(PHONE_RE);
    if (phoneMatch) {
      slots.phone = phoneMatch[0].replace(/[\s\-()]/g, "");
    } else if (mongoose.Types.ObjectId.isValid(msg)) {
      slots.leadId = msg;
    } else {
      const inferred = detectDispositionAction(msg);
      if (inferred) slots.action = inferred;
      return {
        answer: "Send the lead phone number or lead id to continue.",
        activeWorkflow: { ...workflow, slots, missing: ["phone"] },
        ui: {
          type: "choices",
          id: "cancel",
          prompt: "Or cancel",
          options: [{ label: "Cancel", value: "cancel" }],
        },
      };
    }
  } else if (!slots.action) {
    const inferred = detectDispositionAction(msg);
    if (inferred) slots.action = inferred;
  } else if (!slots.leadQualityByReviewer) {
    const q = LEAD_QUALITY_BY_REVIEWER_OPTIONS.find(
      (o) => o.toLowerCase() === lower,
    );
    if (q) slots.leadQualityByReviewer = q;
  } else if (!slots.reason && (slots.action === "reject_lead" || slots.action === "decline_lead")) {
    slots.reason = msg;
  }

  // Resolve lead
  if (!slots.leadId) {
    const found = await findLeadForWorkflow({
      phone: asString(slots.phone),
      leadId: asString(slots.leadId) || undefined,
    });
    if (!found) {
      return {
        answer: `No lead found for ${asString(slots.phone) || "that id"}. Try another phone or cancel.`,
        activeWorkflow: {
          ...workflow,
          slots: { ...slots, phone: undefined, leadId: undefined },
          missing: ["phone"],
          status: "collecting",
        },
      };
    }
    slots.leadId = found.leadId;
    slots.leadName = found.name;
    slots.phone = found.phoneNo;
    slots.beforeStatus = found.leadStatus;
  }

  if (!slots.action) {
    const before = asString(slots.beforeStatus) || "fresh";
    const allowed = primaryDispositionActionsForLeadStatus(before).filter(
      (a) => a !== "revert_to_fresh",
    ) as DispositionAction[];
    if (allowed.length === 0) {
      return {
        answer: `No Agent disposition actions are available while this lead is ${formatLeadStatusLabel(before)}.`,
        activeWorkflow: null,
        done: true,
      };
    }
    return {
      answer: `Lead **${asString(slots.leadName) || asString(slots.phone)}** is ${formatLeadStatusLabel(before)}. Which action?`,
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["action"],
        status: "collecting",
      },
      ui: {
        type: "choices",
        id: "action",
        prompt: "Choose action",
        options: allowed.map((a) => ({
          label:
            a === "good_to_go"
              ? "Good To Go"
              : a === "reject_lead"
                ? "Reject"
                : "Decline",
          value: `action:${a}`,
        })),
      },
    };
  }

  const action = slots.action as DispositionAction;
  const before = asString(slots.beforeStatus) || "fresh";

  try {
    assertValidDispositionTransition(
      before,
      action as CoreWhatsAppDispositionAction,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Illegal transition";
    return {
      answer: message,
      activeWorkflow: null,
      done: true,
    };
  }

  if (!slots.leadQualityByReviewer) {
    return {
      answer: "Select lead quality (required):",
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["leadQualityByReviewer"],
        status: "collecting",
      },
      ui: {
        type: "choices",
        id: "quality",
        prompt: "Lead quality",
        options: LEAD_QUALITY_BY_REVIEWER_OPTIONS.map((q) => ({
          label: q,
          value: `quality:${q}`,
        })),
      },
    };
  }

  if (action === "reject_lead" && !asString(slots.reason)) {
    return {
      answer: "Select a rejection reason:",
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["reason"],
        status: "collecting",
      },
      ui: {
        type: "choices",
        id: "reason",
        prompt: "Rejection reason",
        options: LEAD_REJECTION_REASONS.map((r) => ({
          label: r,
          value: `reason:${r}`,
        })),
      },
    };
  }

  if (action === "decline_lead" && !asString(slots.reason)) {
    return {
      answer: "Select a decline reason:",
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["reason"],
        status: "collecting",
      },
      ui: {
        type: "choices",
        id: "reason",
        prompt: "Decline reason",
        options: LEAD_DECLINE_REASONS.map((r) => ({
          label: r,
          value: `reason:${r}`,
        })),
      },
    };
  }

  const lines = describeDispositionPlan(
    before,
    action,
    asString(slots.leadQualityByReviewer),
    asString(slots.reason) || undefined,
  );
  lines.unshift(
    `Lead: ${asString(slots.leadName) || "—"} · ${asString(slots.phone)}`,
  );

  const next: ActiveWorkflow = {
    workflowId: "apply_disposition",
    status: "awaiting_confirm",
    slots,
    missing: [],
    preview: {
      leadId: slots.leadId,
      action,
      beforeStatus: before,
      leadQualityByReviewer: slots.leadQualityByReviewer,
      reason: slots.reason,
    },
    startedAt: workflow.startedAt,
  };

  return {
    answer: "Review the plan and Confirm to apply.",
    activeWorkflow: next,
    ui: {
      type: "plan",
      title: "Confirm disposition",
      lines,
      confirmLabel: "Confirm",
    },
  };
}
