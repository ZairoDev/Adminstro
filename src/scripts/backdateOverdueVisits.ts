/**
 * Local helper: backdate visits so the 4-day close-out lock can be tested.
 *
 * Usage:
 *   npm run seed:overdue-visits -- --email you@company.com
 *   npm run seed:overdue-visits -- --email you@company.com --count 2 --days 5
 *   npm run seed:overdue-visits -- --email you@company.com --dry-run
 *   npm run seed:overdue-visits -- --email you@company.com --include-completed
 *
 * Then log in as that email and open /dashboard or /whatsapp.
 *
 * Do not run against production.
 */
import "dotenv/config";
import * as dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

import { connectDb } from "@/util/db";
import Visits from "@/models/visit";
import {
  ACTIVE_VISIT_STATUSES,
  isVisitEligibleForStatusLock,
  VISIT_CLOSE_WINDOW_DAYS,
  VISIT_STATUS_LOCK_START,
} from "@/lib/visits/visitStatus";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.MONGO_DB_URL && process.env.MONGODB_URI) {
  process.env.MONGO_DB_URL = process.env.MONGODB_URI;
}

interface CliOptions {
  email: string;
  count: number;
  days: number;
  dryRun: boolean;
  includeCompleted: boolean;
}

function printUsage(): void {
  console.log(`
Backdate visits for the overdue lock.

  npm run seed:overdue-visits -- --email you@company.com
  npm run seed:overdue-visits -- --email you@company.com --count 2 --days 5
  npm run seed:overdue-visits -- --email you@company.com --dry-run
  npm run seed:overdue-visits -- --email you@company.com --include-completed

Options:
  --email               required, createdBy on the visit
  --count               how many visits to backdate (default 2)
  --days                days in the past for schedule.date (default 5, must be >= ${VISIT_CLOSE_WINDOW_DAYS})
  --dry-run             print matches, do not write
  --include-completed   reopen completed visits if there are not enough active ones
`);
}

function parseArgs(argv: string[]): CliOptions {
  const raw: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      raw[key] = true;
    } else {
      raw[key] = next;
      index += 1;
    }
  }

  if (raw.help === true || raw.h === true) {
    printUsage();
    process.exit(0);
  }

  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  if (!email || !email.includes("@")) {
    printUsage();
    throw new Error("--email is required (must be the login email on createdBy)");
  }

  const count = Number.parseInt(String(raw.count ?? "2"), 10);
  const days = Number.parseInt(String(raw.days ?? "5"), 10);

  if (!Number.isInteger(count) || count < 1) {
    throw new Error("--count must be a positive integer");
  }
  if (!Number.isInteger(days) || days < VISIT_CLOSE_WINDOW_DAYS) {
    throw new Error(
      `--days must be an integer >= ${VISIT_CLOSE_WINDOW_DAYS} so the visit is overdue`,
    );
  }

  return {
    email,
    count,
    days,
    dryRun: raw["dry-run"] === true,
    includeCompleted: raw["include-completed"] === true,
  };
}

function createdByFilter(email: string): Record<string, unknown> {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { createdBy: { $regex: `^${escaped}$`, $options: "i" } };
}

async function backdateOverdueVisits() {
  const options = parseArgs(process.argv.slice(2));
  await connectDb();

  const ownerFilter = createdByFilter(options.email);
  const owned = await Visits.find({
    ...ownerFilter,
    createdAt: { $gte: VISIT_STATUS_LOCK_START },
  })
    .select("_id VSID visitStatus outcome createdBy schedule createdAt")
    .sort({ createdAt: -1 })
    .lean<{
      _id: mongoose.Types.ObjectId;
      VSID?: string;
      visitStatus?: string;
      outcome?: string;
      createdBy?: string;
      createdAt?: Date;
      schedule?: { date?: Date; time?: string }[];
    }[]>();

  if (owned.length === 0) {
    console.error(
      `No visits found for createdBy="${options.email}" created on or after ${VISIT_STATUS_LOCK_START.toISOString()}. The overdue lock ignores older visits.`,
    );
    process.exit(1);
  }

  const lockEligible = owned.filter((visit) =>
    isVisitEligibleForStatusLock(visit.createdAt),
  );
  const active = lockEligible.filter((visit) =>
    ACTIVE_VISIT_STATUSES.includes(visit.visitStatus as (typeof ACTIVE_VISIT_STATUSES)[number]),
  );
  const completed = lockEligible.filter((visit) => visit.visitStatus === "completed");
  const candidates = options.includeCompleted
    ? [...active, ...completed]
    : active;
  const selected = candidates.slice(0, options.count);

  console.log("Owned visits:", {
    email: options.email,
    total: owned.length,
    scheduledOrRescheduled: active.length,
    completed: completed.length,
  });

  if (selected.length === 0) {
    console.error(
      "Nothing to backdate. Create a visit as this user, or pass --include-completed to reopen closed ones.",
    );
    process.exit(1);
  }

  if (selected.length < options.count) {
    console.warn(
      `Only ${selected.length} eligible visit(s); requested ${options.count}.` +
        (options.includeCompleted ? "" : " Pass --include-completed to also reopen completed visits."),
    );
  }

  const scheduledAt = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);

  for (const visit of selected) {
    const time = visit.schedule?.[0]?.time || "11:00";
    const summary = {
      id: visit._id.toString(),
      VSID: visit.VSID || "(no VSID)",
      from: visit.visitStatus,
      to: "scheduled",
      scheduleDate: scheduledAt.toISOString(),
      time,
    };

    if (options.dryRun) {
      console.log("[dry-run]", summary);
      continue;
    }

    await Visits.updateOne(
      { _id: visit._id },
      {
        $set: {
          visitStatus: "scheduled",
          outcome: "none",
          schedule: [{ date: scheduledAt, time }],
        },
        $unset: {
          completedAt: "",
          completedBy: "",
          completionSource: "",
          outcomeReason: "",
          rejectionReason: "",
        },
      },
    );

    console.log("Backdated", summary);
  }

  if (!options.dryRun) {
    console.log(
      `\nDone. Log in as ${options.email}, refresh, then open /dashboard or /whatsapp.`,
    );
  }

  await mongoose.disconnect();
  process.exit(0);
}

backdateOverdueVisits().catch((error) => {
  console.error("Backdate overdue visits failed:", error);
  process.exit(1);
});
