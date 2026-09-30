import type { CrmAgentCaller } from "@/services/crm-agent/types";
import { canRunAgentWriteWorkflow } from "@/services/crm-agent/guards/access";
import type {
  ActiveWorkflow,
  CrmAgentMode,
  WorkflowStepResult,
} from "@/services/crm-agent/workflows/types";
import {
  advanceDispositionWorkflow,
  looksLikeDispositionIntent,
  startDispositionWorkflow,
} from "@/services/crm-agent/workflows/applyDisposition";
import {
  advanceReminderWorkflow,
  looksLikeReminderIntent,
  startReminderWorkflow,
} from "@/services/crm-agent/workflows/setReminder";
import {
  looksLikeTeamTodayIntent,
  runTeamTodayReport,
} from "@/services/crm-agent/workflows/teamTodayReport";

export function detectAgentWorkflowStart(
  message: string,
): ActiveWorkflow | "report_my_team_today" | null {
  if (looksLikeTeamTodayIntent(message)) return "report_my_team_today";
  if (looksLikeDispositionIntent(message)) {
    return startDispositionWorkflow(message);
  }
  if (looksLikeReminderIntent(message)) {
    return startReminderWorkflow(message);
  }
  return null;
}

export async function processAgentTurn(params: {
  mode: CrmAgentMode;
  message: string;
  caller: CrmAgentCaller;
  callerEmail?: string;
  activeWorkflow: ActiveWorkflow | null | undefined;
}): Promise<WorkflowStepResult | null> {
  const { mode, message, caller, callerEmail } = params;

  // Team today / reports are handled by Ask report tools + LLM (richer answers).
  // Agent write intents still blocked here.
  if (mode === "ask") {
    if (
      looksLikeDispositionIntent(message)
      || looksLikeReminderIntent(message)
    ) {
      return {
        answer:
          "You're in **Ask** mode (read-only). Switch to **Agent** to change lead status or create reminders. I can still explain how Good To Go works if you ask.",
        activeWorkflow: null,
      };
    }
    return null;
  }

  // Agent mode
  let workflow = params.activeWorkflow ?? null;

  if (workflow && workflow.status !== "done" && workflow.status !== "cancelled") {
    if (workflow.status === "awaiting_confirm") {
      const lower = message.trim().toLowerCase();
      if (lower === "cancel" || lower === "stop") {
        return {
          answer: "Cancelled.",
          activeWorkflow: null,
          done: true,
        };
      }
      return {
        answer:
          "A plan is ready. Use **Confirm** or **Cancel** on the plan card (or type cancel).",
        activeWorkflow: workflow,
        ui: {
          type: "plan",
          title: "Waiting for confirm",
          lines: Object.entries(workflow.preview ?? workflow.slots).map(
            ([k, v]) => `${k}: ${String(v)}`,
          ),
          confirmLabel: "Confirm",
        },
      };
    }

    if (workflow.workflowId === "apply_disposition") {
      return advanceDispositionWorkflow(workflow, message);
    }
    if (workflow.workflowId === "set_reminder") {
      return advanceReminderWorkflow(workflow, message);
    }
  }

  const started = detectAgentWorkflowStart(message);
  if (started === "report_my_team_today") {
    return runTeamTodayReport({ caller, callerEmail });
  }
  if (!started) return null;

  if (
    (started.workflowId === "apply_disposition"
      || started.workflowId === "set_reminder")
    && !canRunAgentWriteWorkflow(caller.role)
  ) {
    return {
      answer: `Your role (${caller.role}) cannot run Agent write workflows. Use Ask mode for questions, or ask a Sales-capable user.`,
      activeWorkflow: null,
    };
  }

  if (started.workflowId === "apply_disposition") {
    return advanceDispositionWorkflow(started, message);
  }
  if (started.workflowId === "set_reminder") {
    return advanceReminderWorkflow(started, message);
  }

  return null;
}
