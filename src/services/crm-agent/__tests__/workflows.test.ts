import { describe, expect, it } from "@jest/globals";
import {
  canRunAgentWriteWorkflow,
  canUseTool,
} from "@/services/crm-agent/guards/access";
import {
  detectDispositionAction,
  looksLikeDispositionIntent,
  startDispositionWorkflow,
} from "@/services/crm-agent/workflows/applyDisposition";
import {
  looksLikeReminderIntent,
  startReminderWorkflow,
} from "@/services/crm-agent/workflows/setReminder";
import { looksLikeTeamTodayIntent } from "@/services/crm-agent/workflows/teamTodayReport";
import { detectAgentWorkflowStart, processAgentTurn } from "@/services/crm-agent/workflows/engine";
import {
  assertValidDispositionTransition,
} from "@/lib/leads/leadDisposition";

describe("crm-agent workflow detection", () => {
  it("detects disposition actions", () => {
    expect(detectDispositionAction("mark good to go")).toBe("good_to_go");
    expect(detectDispositionAction("reject this lead")).toBe("reject_lead");
    expect(detectDispositionAction("decline the lead")).toBe("decline_lead");
    expect(looksLikeDispositionIntent("move this lead")).toBe(true);
  });

  it("starts disposition with phone and action slots", () => {
    const wf = startDispositionWorkflow("good to go 9876543210");
    expect(wf.workflowId).toBe("apply_disposition");
    expect(wf.slots.action).toBe("good_to_go");
    expect(String(wf.slots.phone)).toContain("9876543210");
  });

  it("detects reminder and team today", () => {
    expect(looksLikeReminderIntent("set a reminder for tomorrow")).toBe(true);
    expect(looksLikeTeamTodayIntent("my team today")).toBe(true);
    expect(detectAgentWorkflowStart("my team today")).toBe(
      "report_my_team_today",
    );
    const rem = startReminderWorkflow("remind me personal tomorrow");
    expect(rem.workflowId).toBe("set_reminder");
    expect(rem.slots.target).toBe("personal");
  });
});

describe("crm-agent disposition transitions", () => {
  it("allows fresh → good_to_go and fresh → reject", () => {
    expect(() =>
      assertValidDispositionTransition("fresh", "good_to_go"),
    ).not.toThrow();
    expect(() =>
      assertValidDispositionTransition("fresh", "reject_lead"),
    ).not.toThrow();
  });

  it("blocks active → good_to_go", () => {
    expect(() =>
      assertValidDispositionTransition("active", "good_to_go"),
    ).toThrow();
  });

  it("allows active → decline only", () => {
    expect(() =>
      assertValidDispositionTransition("active", "decline_lead"),
    ).not.toThrow();
    expect(() =>
      assertValidDispositionTransition("fresh", "decline_lead"),
    ).toThrow();
  });
});

describe("crm-agent Ask mode write block", () => {
  it("Ask mode refuses disposition without starting workflow", async () => {
    const result = await processAgentTurn({
      mode: "ask",
      message: "good to go 9876543210",
      caller: { employeeId: "1", role: "Sales-TeamLead" },
      activeWorkflow: null,
    });
    expect(result).not.toBeNull();
    expect(result?.activeWorkflow).toBeNull();
    expect(result?.answer).toMatch(/Ask/i);
    expect(result?.answer).toMatch(/Agent/i);
  });

  it("Ask mode refuses reminder writes", async () => {
    const result = await processAgentTurn({
      mode: "ask",
      message: "set a personal reminder",
      caller: { employeeId: "1", role: "Sales" },
      activeWorkflow: null,
    });
    expect(result?.activeWorkflow).toBeNull();
    expect(result?.answer).toMatch(/Ask/i);
  });
});

describe("crm-agent write role guards", () => {
  it("Sales-capable can run Agent write workflows", () => {
    expect(canRunAgentWriteWorkflow("Sales-TeamLead")).toBe(true);
    expect(canRunAgentWriteWorkflow("SuperAdmin")).toBe(true);
    // Sales not in default CRM_AGENT_WRITE_ROLES pilot list
    expect(canRunAgentWriteWorkflow("Sales")).toBe(false);
  });

  it("pure HR cannot run Agent write workflows", () => {
    expect(canRunAgentWriteWorkflow("HR")).toBe(false);
  });

  it("HR is blocked when starting disposition in Agent mode", async () => {
    const result = await processAgentTurn({
      mode: "agent",
      message: "good to go 9876543210",
      caller: { employeeId: "1", role: "HR" },
      activeWorkflow: null,
    });
    expect(result?.activeWorkflow).toBeNull();
    expect(result?.answer).toMatch(/cannot run Agent write/i);
  });

  it("proposeWrite tool still lists HR for legacy personal reminders", () => {
    expect(canUseTool("proposeWrite", "HR")).toBe(true);
  });
});

describe("crm-agent awaiting_confirm cancel via chat", () => {
  it("cancel clears awaiting_confirm workflow", async () => {
    const result = await processAgentTurn({
      mode: "agent",
      message: "cancel",
      caller: { employeeId: "1", role: "Sales-TeamLead" },
      activeWorkflow: {
        workflowId: "apply_disposition",
        status: "awaiting_confirm",
        slots: { leadId: "abc", action: "good_to_go" },
        missing: [],
        startedAt: new Date().toISOString(),
      },
    });
    expect(result?.activeWorkflow).toBeNull();
    expect(result?.answer).toMatch(/Cancelled/i);
  });
});
