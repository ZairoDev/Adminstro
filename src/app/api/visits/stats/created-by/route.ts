import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import Visits from "@/models/visit";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic";

function getRange(days?: string): { start: Date; end: Date; mode: "day" | "month" | "year" } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const norm = (days || "12 days").toLowerCase();

  switch (norm) {
    case "12 days": {
      // Visits are typically scheduled into the near future.
      // Include a small forward window so "latest scheduled visits" show up.
      const s = new Date(start);
      s.setDate(s.getDate() - 11);
      const e = new Date(end);
      e.setDate(e.getDate() + 11);
      return { start: s, end: e, mode: "day" };
    }
    case "this month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e, mode: "day" };
    }
    case "last month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      s.setHours(0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e, mode: "day" };
    }
    case "1 year": {
      const s = new Date(now);
      s.setMonth(s.getMonth() - 11);
      s.setDate(1);
      s.setHours(0, 0, 0, 0);
      return { start: s, end, mode: "month" };
    }
    default: {
      // fallback: 12 days
      start.setDate(start.getDate() - 11);
      return { start, end, mode: "day" };
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();

    const days = req.nextUrl.searchParams.get("days") || "12 days";
    const { start, end, mode } = getRange(days);

    // Aggregate by visit "created date" + createdBy.
    // For dashboard usage, we want "who created the visit" over time,
    // so default to createdAt. (Scheduled dates can be far in the future,
    // which makes short ranges look empty.)
    const dateFormat = mode === "month" ? "%Y-%m" : "%Y-%m-%d";

    const rows = await Visits.aggregate([
      { $unwind: { path: "$schedule", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          _visitDate: "$createdAt",
          _createdBy: { $ifNull: ["$createdBy", "Unknown"] },
        }
      },
      {
        $match: {
          _visitDate: { $gte: start, $lte: end },
        }
      },
      {
        $addFields: {
          _dateKey: {
            $dateToString: {
              format: dateFormat,
              date: "$_visitDate",
              timezone: "Asia/Kolkata",
            },
          },
        }
      },
      {
        $group: {
          _id: { date: "$_dateKey", createdBy: "$_createdBy" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const creatorSet = new Set<string>();
    const byDate = new Map<string, Record<string, number>>();

    for (const r of rows) {
      const dateKey = String(r?._id?.date || "");
      const createdBy = String(r?._id?.createdBy || "Unknown");
      const count = Number(r?.count || 0);
      if (!dateKey) continue;
      creatorSet.add(createdBy);
      const bucket = byDate.get(dateKey) || {};
      bucket[createdBy] = (bucket[createdBy] || 0) + count;
      byDate.set(dateKey, bucket);
    }

    const creatorEmailsOrIds = Array.from(creatorSet).sort((a, b) => a.localeCompare(b));

    // Map createdBy (email) -> employee name, so UI doesn't show emails.
    const employees = await Employees.find({
      email: { $in: creatorEmailsOrIds.filter((c) => c.includes("@")) },
    })
      .select("email name")
      .lean<{ email?: string; name?: string }[]>();

    const emailToName = new Map<string, string>();
    for (const e of employees) {
      if (e?.email && e?.name) emailToName.set(String(e.email), String(e.name));
    }

    const used = new Set<string>();
    const creatorKeyMap = new Map<string, string>(); // createdBy -> displayKey
    for (const c of creatorEmailsOrIds) {
      const base = emailToName.get(c) || c;
      let key = base;
      if (used.has(key)) {
        // Make it unique without exposing full email.
        const suffix = c.includes("@") ? c.split("@")[0] : c;
        key = `${base} (${suffix})`;
      }
      used.add(key);
      creatorKeyMap.set(c, key);
    }

    // Convert to recharts-friendly array using display keys.
    const creators = creatorEmailsOrIds.map((c) => creatorKeyMap.get(c) || c);
    const data = Array.from(byDate.entries()).map(([date, bucket]) => {
      const row: Record<string, number | string> = { date };
      for (const rawCreator of creatorEmailsOrIds) {
        const key = creatorKeyMap.get(rawCreator) || rawCreator;
        row[key] = bucket[rawCreator] || 0;
      }
      return row;
    });

    return NextResponse.json({ success: true, days, creators, data });
  } catch (err: any) {
    const status = err?.status ?? 401;
    const code = err?.code ?? "AUTH_FAILED";
    if (status === 401 || status === 403) {
      return NextResponse.json({ code }, { status });
    }
    console.error("[visits stats created-by] error", err);
    return NextResponse.json({ error: "Failed to fetch visit stats" }, { status: 500 });
  }
}

