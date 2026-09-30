import mongoose from "mongoose";
import Query from "@/models/query";
import Candidate from "@/models/candidate";
import Employees from "@/models/employee";
import PersonalReminder from "@/models/personalReminder";
import WhatsAppConversation from "@/models/whatsappConversation";
import { connectDb } from "@/util/db";
import { buildCreatedAtRangeQuery } from "@/lib/leads/istDateRange";
import { getOverdueVisitsForUser } from "@/services/visits/visitService";
import { getFinanceOverview } from "@/services/finance/financePaymentService";
import {
  canUseTool,
  sanitizeToolData,
  type ToolName,
} from "@/services/crm-agent/guards/access";
import type { CrmAgentCaller, ToolResult } from "@/services/crm-agent/types";

function deny(tool: ToolName, role: string): ToolResult {
  return {
    name: tool,
    ok: false,
    error: `Role ${role} cannot use tool ${tool}`,
    summary: "access_denied",
  };
}

function todayIstYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgoIstYmd(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function leadScopeMatch(
  caller: CrmAgentCaller,
  callerEmail?: string,
): Record<string, unknown> {
  if (
    caller.role === "SuperAdmin"
    || caller.role === "Developer"
    || caller.role === "Sales-TeamLead"
    || caller.role === "Admin"
  ) {
    return {};
  }
  if (callerEmail) return { createdBy: callerEmail };
  return {};
}

export async function getTeamTodayReportTool(
  caller: CrmAgentCaller,
  callerEmail?: string,
): Promise<ToolResult> {
  const name: ToolName = "getTeamTodayReport";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const ymd = todayIstYmd();
  const match: Record<string, unknown> = {
    ...buildCreatedAtRangeQuery(ymd, ymd),
    ...leadScopeMatch(caller, callerEmail),
  };

  const byStatus = await Query.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$leadStatus", count: { $sum: 1 } } },
  ]);
  const statusMap = new Map(byStatus.map((r) => [r._id || "unknown", r.count]));
  const pick = (s: string) => statusMap.get(s) ?? 0;

  let overdue = 0;
  if (callerEmail) {
    try {
      overdue = (await getOverdueVisitsForUser(callerEmail)).length;
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

  return {
    name,
    ok: true,
    data: { date: ymd, metrics },
    summary: `Team today ${ymd}: overdue=${overdue} fresh=${pick("fresh")}`,
    deepLinks: [
      "/dashboard/visits",
      "/dashboard/goodtogoleads",
      "/dashboard/reminders",
    ],
  };
}

export async function getDailyLeadStatsTool(
  caller: CrmAgentCaller,
  callerEmail?: string,
): Promise<ToolResult> {
  const name: ToolName = "getDailyLeadStats";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const to = todayIstYmd();
  const from = daysAgoIstYmd(6);
  const match: Record<string, unknown> = {
    ...buildCreatedAtRangeQuery(from, to),
    ...leadScopeMatch(caller, callerEmail),
  };

  const byDay = await Query.aggregate<{ _id: string; count: number }>([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            date: "$createdAt",
            format: "%Y-%m-%d",
            timezone: "Asia/Kolkata",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const byStatus = await Query.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$leadStatus", count: { $sum: 1 } } },
  ]);

  const total = byDay.reduce((s, r) => s + r.count, 0);
  const metrics = [
    { label: `Total leads (${from} → ${to})`, value: total, href: "/dashboard/compareLeads" },
    ...byStatus.slice(0, 8).map((r) => ({
      label: String(r._id || "unknown"),
      value: r.count,
      href: "/dashboard/rolebaseLead",
    })),
  ];
  const data = sanitizeToolData(
    name,
    {
      from,
      to,
      total,
      metrics,
      byDay: byDay.map((r) => ({ date: r._id, count: r.count })),
      byStatus: byStatus.map((r) => ({
        status: r._id || "unknown",
        count: r.count,
      })),
    },
    caller,
  );

  return {
    name,
    ok: true,
    data,
    summary: `Lead stats ${from}→${to}: ${total} leads`,
    deepLinks: ["/dashboard/compareLeads"],
  };
}

export async function getLeadStatusCountsTool(
  caller: CrmAgentCaller,
  callerEmail?: string,
): Promise<ToolResult> {
  const name: ToolName = "getLeadStatusCounts";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const match = leadScopeMatch(caller, callerEmail);
  const rows = await Query.aggregate<{ _id: string; count: number }>([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $group: { _id: "$leadStatus", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return {
    name,
    ok: true,
    data: sanitizeToolData(
      name,
      {
        counts: rows.map((r) => ({
          status: r._id || "unknown",
          count: r.count,
        })),
      },
      caller,
    ),
    summary: `${rows.length} status buckets`,
    deepLinks: ["/dashboard/rolebaseLead"],
  };
}

export async function getHiringPipelineSummaryTool(
  caller: CrmAgentCaller,
): Promise<ToolResult> {
  const name: ToolName = "getHiringPipelineSummary";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const byStatus = await Candidate.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const activeEmployees = await Candidate.countDocuments({
    employeeId: { $ne: null },
    exitedAt: null,
  });
  const exited = await Candidate.countDocuments({
    exitedAt: { $ne: null },
  });

  const metrics = [
    ...byStatus.map((r) => ({
      label: `Candidates · ${r._id || "unknown"}`,
      value: r.count,
      href: "/dashboard/people",
    })),
    {
      label: "Linked employees (active)",
      value: activeEmployees,
      href: "/dashboard/people",
    },
    { label: "Exited", value: exited, href: "/dashboard/people" },
  ];

  return {
    name,
    ok: true,
    data: { metrics, byStatus },
    summary: `Hiring pipeline: ${byStatus.map((r) => `${r._id}:${r.count}`).join(", ")}`,
    deepLinks: ["/dashboard/people"],
  };
}

export async function findEmployeeTool(
  caller: CrmAgentCaller,
  search: string,
): Promise<ToolResult> {
  const name: ToolName = "findEmployee";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const q = search.trim().slice(0, 80);
  if (q.length < 2) {
    return {
      name,
      ok: true,
      data: null,
      summary: "Search too short",
      deepLinks: ["/dashboard/employee"],
    };
  }

  const digits = q.replace(/\D/g, "");
  const filter =
    digits.length >= 8
      ? { phone: { $regex: digits.slice(-10), $options: "i" } }
      : {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { employeeCode: { $regex: q, $options: "i" } },
          ],
        };

  const rows = await Employees.find(filter)
    .select("name email phone role employeeCode allotedArea isActive rentalType")
    .limit(10)
    .lean();

  return {
    name,
    ok: true,
    data: sanitizeToolData(name, rows, caller),
    summary: rows.length
      ? `Found ${rows.length} employee(s)`
      : "Employee not found",
    deepLinks: ["/dashboard/employee"],
  };
}

export async function listMyRemindersTool(
  caller: CrmAgentCaller,
  callerEmail?: string,
): Promise<ToolResult> {
  const name: ToolName = "listMyReminders";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();

  const personal = await PersonalReminder.find({
    employeeId: new mongoose.Types.ObjectId(caller.employeeId),
    status: "pending",
  })
    .sort({ scheduledAt: 1 })
    .limit(20)
    .select("_id title note scheduledAt status")
    .lean();

  const leadFilter: Record<string, unknown> = {
    leadStatus: "reminder",
  };
  if (callerEmail) leadFilter.createdBy = callerEmail;

  const leadReminders = await Query.find(leadFilter)
    .sort({ reminder: 1 })
    .limit(20)
    .select("_id name phoneNo reminder reason leadStatus")
    .lean();

  return {
    name,
    ok: true,
    data: sanitizeToolData(
      name,
      {
        personal: personal.slice(0, 20),
        leadReminders: leadReminders.slice(0, 20),
      },
      caller,
    ),
    summary: `Personal ${personal.length}, lead ${leadReminders.length}`,
    deepLinks: ["/dashboard/my-reminders", "/dashboard/reminders"],
  };
}

export async function getFinanceOverviewLiveTool(
  caller: CrmAgentCaller,
): Promise<ToolResult> {
  const name: ToolName = "getFinanceOverview";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  try {
    await connectDb();
    const overview = await getFinanceOverview();
    return {
      name,
      ok: true,
      data: sanitizeToolData(name, overview, caller),
      summary: `Finance today=${overview.todayCollection} week=${overview.weekCollection}`,
      deepLinks: ["/dashboard/finance"],
    };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : "Finance overview failed",
      summary: "finance_failed",
      deepLinks: ["/dashboard/finance"],
    };
  }
}

export async function getWhatsAppInboxCountsTool(
  caller: CrmAgentCaller,
): Promise<ToolResult> {
  const name: ToolName = "getWhatsAppInboxCounts";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();

  const [totalCount, ownerCount, guestCount] = await Promise.all([
    WhatsAppConversation.countDocuments({}),
    WhatsAppConversation.countDocuments({ conversationType: "owner" }),
    WhatsAppConversation.countDocuments({ conversationType: "guest" }),
  ]);

  const metrics = [
    { label: "Total conversations", value: totalCount, href: "/whatsapp" },
    { label: "Owner", value: ownerCount, href: "/whatsapp" },
    { label: "Guest", value: guestCount, href: "/whatsapp" },
  ];

  return {
    name,
    ok: true,
    data: { metrics, totalCount, ownerCount, guestCount },
    summary: `WA inbox total=${totalCount}`,
    deepLinks: ["/whatsapp"],
  };
}
