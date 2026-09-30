/**
 * Offline Agent Mode golden eval (8 cases, ≥80% pass).
 * Heuristic checks for intent detection, Ask block, slot/plan shape — no DB writes.
 */
import {
  detectDispositionAction,
  looksLikeDispositionIntent,
  startDispositionWorkflow,
} from "@/services/crm-agent/workflows/applyDisposition";
import { looksLikeReminderIntent } from "@/services/crm-agent/workflows/setReminder";
import { looksLikeTeamTodayIntent } from "@/services/crm-agent/workflows/teamTodayReport";
import { processAgentTurn } from "@/services/crm-agent/workflows/engine";
import { canRunAgentWriteWorkflow } from "@/services/crm-agent/guards/access";
import { assertValidDispositionTransition } from "@/lib/leads/leadDisposition";

type AgentCase = {
  id: string;
  name: string;
  run: () => Promise<boolean> | boolean;
};

const CASES: AgentCase[] = [
  {
    id: "A1",
    name: "GTG intent detects good_to_go",
    run: () => detectDispositionAction("please mark good to go") === "good_to_go",
  },
  {
    id: "A2",
    name: "Reject intent + quality-always slot missing until collected",
    run: () => {
      const wf = startDispositionWorkflow("reject lead 9876543210");
      return (
        wf.slots.action === "reject_lead"
        && !wf.slots.leadQualityByReviewer
        && looksLikeDispositionIntent("reject lead")
      );
    },
  },
  {
    id: "A3",
    name: "Ask mode blocks GTG write",
    run: async () => {
      const r = await processAgentTurn({
        mode: "ask",
        message: "good to go 9876543210",
        caller: { employeeId: "1", role: "Sales-TeamLead" },
        activeWorkflow: null,
      });
      return Boolean(r && !r.activeWorkflow && /Agent/i.test(r.answer));
    },
  },
  {
    id: "A4",
    name: "Illegal active→GTG transition throws",
    run: () => {
      try {
        assertValidDispositionTransition("active", "good_to_go");
        return false;
      } catch {
        return true;
      }
    },
  },
  {
    id: "A5",
    name: "Reminder intent detected",
    run: () => looksLikeReminderIntent("set a reminder for this lead"),
  },
  {
    id: "A6",
    name: "My team today intent detected",
    run: () => looksLikeTeamTodayIntent("show my team today"),
  },
  {
    id: "A7",
    name: "HR cannot Agent-write; Sales-TL can",
    run: () =>
      !canRunAgentWriteWorkflow("HR")
      && canRunAgentWriteWorkflow("Sales-TeamLead"),
  },
  {
    id: "A8",
    name: "Agent cancel clears awaiting_confirm",
    run: async () => {
      const r = await processAgentTurn({
        mode: "agent",
        message: "cancel",
        caller: { employeeId: "1", role: "Sales-TeamLead" },
        activeWorkflow: {
          workflowId: "set_reminder",
          status: "awaiting_confirm",
          slots: { target: "personal" },
          missing: [],
          startedAt: new Date().toISOString(),
        },
      });
      return Boolean(r && r.activeWorkflow === null);
    },
  },
];

async function main() {
  let pass = 0;
  for (const c of CASES) {
    let ok = false;
    try {
      ok = Boolean(await c.run());
    } catch (err) {
      console.error(`ERROR ${c.id}:`, err);
    }
    if (ok) {
      pass += 1;
      console.log(`PASS ${c.id}: ${c.name}`);
    } else {
      console.log(`FAIL ${c.id}: ${c.name}`);
    }
  }
  const total = CASES.length;
  const pct = Math.round((pass / total) * 100);
  console.log(`\nAgent golden: ${pass}/${total} (${pct}%)`);
  if (pct < 80) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
