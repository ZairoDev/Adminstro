import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOwnerSheetEmployeeStats } from "@/services/owner-sheet/employee-stats.service";
import { isLocationExempt } from "@/util/apiSecurity";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { parseAllotedAreaFromToken } from "@/util/ownerSheetLocationFilter";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = new Set([
  "SuperAdmin",
  "Admin",
  "Developer",
  "HR",
  "LeadGen-TeamLead",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (
      parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 &&
      parsed.getUTCDate() === day
    );
  }, "Invalid date");

const querySchema = z.object({
  from: isoDate.optional(),
  to: isoDate.optional(),
  location: z.string().trim().max(80).optional(),
  sheet: z.enum(["all", "long-term", "short-term"]).optional(),
});

function formatIstDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: formatIstDate(from), to: formatIstDate(to) };
}

export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as {
      role?: string;
      allotedArea?: unknown;
    };
    const role = String(token.role ?? "");
    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = querySchema.safeParse({
      from: req.nextUrl.searchParams.get("from") ?? undefined,
      to: req.nextUrl.searchParams.get("to") ?? undefined,
      location: req.nextUrl.searchParams.get("location") ?? undefined,
      sheet: req.nextUrl.searchParams.get("sheet") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid filters", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const fallback = defaultRange();
    const from = parsed.data.from ?? fallback.from;
    const to = parsed.data.to ?? fallback.to;
    if (from > to) {
      return NextResponse.json(
        { error: "Start date must be on or before the end date" },
        { status: 400 },
      );
    }

    const spanDays =
      (new Date(`${to}T00:00:00.000Z`).getTime() -
        new Date(`${from}T00:00:00.000Z`).getTime()) /
        (24 * 60 * 60 * 1000) +
      1;
    if (spanDays > 366) {
      return NextResponse.json(
        { error: "Date range cannot be longer than 366 days" },
        { status: 400 },
      );
    }

    await connectDb();

    const allowedLocations = isLocationExempt(role)
      ? null
      : parseAllotedAreaFromToken(token.allotedArea);

    const stats = await getOwnerSheetEmployeeStats({
      from,
      to,
      location: parsed.data.location ?? "All",
      sheet: parsed.data.sheet ?? "all",
      allowedLocations,
    });

    return NextResponse.json(stats);
  } catch (err: unknown) {
    const authErr = err as { status?: number; code?: string };
    if (authErr?.status === 401 || authErr?.status === 403) {
      return NextResponse.json(
        { code: authErr.code ?? "AUTH_FAILED" },
        { status: authErr.status },
      );
    }
    console.error("[owner sheet employee stats]", err);
    return NextResponse.json(
      { error: "Failed to load owner sheet stats" },
      { status: 500 },
    );
  }
}
