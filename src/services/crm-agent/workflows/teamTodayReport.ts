import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getOverdueVisitsForUser } from "@/services/visits/visitService";
import { buildCreatedAtRangeQuery } from "@/lib/leads/istDateRange";
import type { WorkflowStepResult } from "@/services/crm-agent/workflows/types";
import type { CrmAgentCaller } from "@/services/crm-agent/types";

function todayIstYmd(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function looksLikeTeamTodayIntent(message: string): boolean {
  return (
    /\bmy\s+team\s+today\b/i.test(message)
    || /\bteam\s+today\b/i.test(message)
    || /\btoday'?s?\s+(lead|visit)\s+stats?\b/i.test(message)
  );
}

/**
 * Read-only report: overdue visits + today's lead counts by status.
 */
export async function runTeamTodayReport(params: {
  caller: CrmAgentCaller;
  callerEmail?: string;
}): Promise<WorkflowStepResult> {
  await connectDb();
  const ymd = todayIstYmd();
  const createdAtRange = buildCreatedAtRangeQuery(ymd, ymd);

  const match: Record<string, unknown> = { ...createdAtRange };
  // Prefer caller's own created leads when email known; SuperAdmin sees all today
  if (
    params.callerEmail
    && params.caller.role !== "SuperAdmin"
    && params.caller.role !== "Developer"
    && params.caller.role !== "Sales-TeamLead"
    && params.caller.role !== "Admin"
  ) {
    match.createdBy = params.callerEmail;
  }

  const byStatus = await Query.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$leadStatus", count: { $sum: 1 } } },
  ]);

  const statusMap = new Map(
    byStatus.map((r) => [r._id || "unknown", r.count]),
  );
  const pick = (s: string) => statusMap.get(s) ?? 0;

  let overdue = 0;
  if (params.callerEmail) {
    try {
      const visits = await getOverdueVisitsForUser(params.callerEmail);
      overdue = visits.length;
    } catch {
      overdue = 0;
    }
  }

  const metrics = [
    { label: "Overdue visits", value: overdue, href: "/dashboard/visits" },
    {
      label: "Fresh (today)",
      value: pick("fresh"),
      href: "/dashboard/rolebaseLead",
    },
    {
      label: "Good To Go / active (today)",
      value: pick("active"),
      href: "/dashboard/goodtogoleads",
    },
    {
      label: "Reminder (today)",
      value: pick("reminder"),
      href: "/dashboard/reminders",
    },
    { label: "Rejected (today)", value: pick("rejected") },
    { label: "Declined (today)", value: pick("declined") },
    { label: "Closed (today)", value: pick("closed") },
  ];

  const answer = [
    `**My team today** (${ymd} IST)`,
    ...metrics.map((m) => `• ${m.label}: ${m.value}`),
  ].join("\n");

  return {
    answer,
    activeWorkflow: null,
    reportOnly: true,
    done: true,
    ui: {
      type: "report",
      title: `My team today · ${ymd}`,
      metrics,
    },
  };
}
