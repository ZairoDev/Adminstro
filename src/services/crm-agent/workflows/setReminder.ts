import type {
  ActiveWorkflow,
  WorkflowStepResult,
} from "@/services/crm-agent/workflows/types";
import { findLeadForWorkflow } from "@/services/crm-agent/workflows/applyDisposition";

const PHONE_RE = /(?:\+?\d[\d\s\-()]{7,}\d)/;

function nowIso(): string {
  return new Date().toISOString();
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function looksLikeReminderIntent(message: string): boolean {
  return /\b(set|create|add)\b.*\breminder\b/i.test(message)
    || /\bremind\s+me\b/i.test(message);
}

export function startReminderWorkflow(message: string): ActiveWorkflow {
  const lower = message.toLowerCase();
  const slots: Record<string, unknown> = {};
  if (/\bpersonal\b/.test(lower) || /\bmy\s+reminder\b/.test(lower)) {
    slots.target = "personal";
  } else if (/\blead\b/.test(lower)) {
    slots.target = "lead";
  }
  const phoneMatch = message.match(PHONE_RE);
  if (phoneMatch) slots.phone = phoneMatch[0].replace(/[\s\-()]/g, "");

  // crude date: ISO or "tomorrow"
  if (/\btomorrow\b/i.test(message)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    slots.scheduledAt = d.toISOString();
  }

  const missing: string[] = [];
  if (!slots.target) missing.push("target");

  return {
    workflowId: "set_reminder",
    status: "collecting",
    slots,
    missing: missing.length ? missing : ["details"],
    startedAt: nowIso(),
  };
}

export async function advanceReminderWorkflow(
  workflow: ActiveWorkflow,
  userMessage: string,
): Promise<WorkflowStepResult> {
  const msg = userMessage.trim();
  const lower = msg.toLowerCase();
  if (lower === "cancel" || lower === "stop") {
    return {
      answer: "Cancelled the reminder workflow.",
      activeWorkflow: null,
      done: true,
    };
  }

  const slots = { ...workflow.slots };

  if (msg.startsWith("target:")) {
    slots.target = msg.slice("target:".length);
  } else if (!slots.target) {
    if (lower.includes("personal")) slots.target = "personal";
    else if (lower.includes("lead")) slots.target = "lead";
  } else if (slots.target === "lead" && !slots.leadId && !slots.phone) {
    const phoneMatch = msg.match(PHONE_RE);
    if (phoneMatch) slots.phone = phoneMatch[0].replace(/[\s\-()]/g, "");
    else if (msg.length === 24) slots.leadId = msg;
  } else if (!slots.scheduledAt) {
    if (/\btomorrow\b/i.test(msg)) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      slots.scheduledAt = d.toISOString();
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(msg)) {
      slots.scheduledAt = msg;
    } else {
      const parsed = new Date(msg);
      if (!Number.isNaN(parsed.getTime())) {
        slots.scheduledAt = parsed.toISOString();
      }
    }
  } else if (!slots.note) {
    if (/^\d{4}-\d{2}-\d{2}T/.test(msg)) {
      slots.scheduledAt = msg;
    } else {
      slots.note = msg;
    }
  }

  if (!slots.target) {
    return {
      answer: "Is this a personal reminder or a lead reminder?",
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["target"],
        status: "collecting",
      },
      ui: {
        type: "choices",
        id: "target",
        prompt: "Reminder type",
        options: [
          { label: "Personal", value: "target:personal" },
          { label: "Lead", value: "target:lead" },
        ],
      },
    };
  }

  if (slots.target === "lead") {
    if (!slots.leadId) {
      const found = await findLeadForWorkflow({
        phone: asString(slots.phone) || undefined,
        leadId: asString(slots.leadId) || undefined,
      });
      if (!found) {
        return {
          answer: "Send the lead phone number (or lead id) for the reminder.",
          activeWorkflow: {
            ...workflow,
            slots,
            missing: ["phone"],
            status: "collecting",
          },
        };
      }
      slots.leadId = found.leadId;
      slots.leadName = found.name;
      slots.phone = found.phoneNo;
    }
  }

  if (!slots.scheduledAt) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return {
      answer: "When should I remind you? (e.g. tomorrow, or an ISO date)",
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["scheduledAt"],
        status: "collecting",
      },
      ui: {
        type: "choices",
        id: "when",
        prompt: "When",
        options: [
          {
            label: "Tomorrow 10:00",
            value: tomorrow.toISOString(),
          },
        ],
      },
    };
  }

  if (!asString(slots.note)) {
    return {
      answer: "Add a short note for this reminder.",
      activeWorkflow: {
        ...workflow,
        slots,
        missing: ["note"],
        status: "collecting",
      },
    };
  }

  const lines = [
    `Type: ${asString(slots.target)}`,
    slots.target === "lead"
      ? `Lead: ${asString(slots.leadName)} · ${asString(slots.phone)}`
      : "Personal reminder",
    `When: ${asString(slots.scheduledAt)}`,
    `Note: ${asString(slots.note)}`,
  ];

  return {
    answer: "Review the reminder plan and Confirm.",
    activeWorkflow: {
      workflowId: "set_reminder",
      status: "awaiting_confirm",
      slots,
      missing: [],
      preview: { ...slots },
      startedAt: workflow.startedAt,
    },
    ui: {
      type: "plan",
      title: "Confirm reminder",
      lines,
      confirmLabel: "Confirm",
    },
  };
}
