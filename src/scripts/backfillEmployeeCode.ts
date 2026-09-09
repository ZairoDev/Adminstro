/**
 * One-time backfill: assigns a permanent ZI-XXXXXX employeeCode to every
 * Employees document created before this feature existed.
 *
 * Idempotent / safe to re-run: only touches documents where employeeCode is
 * still unset, so an interrupted run can simply be re-run to finish the job,
 * and running it again after completion is a no-op.
 *
 * Query note: do NOT use `{ employeeCode: null }` alone. `employeeCode` is a
 * sparse unique index, and legacy docs omit the field entirely (they are not
 * stored as `null`). A null-equality query can use that sparse index and
 * return zero rows even when hundreds of employees still need a code.
 *
 * `employeeCode` is `immutable: true` on the schema (see src/models/employee.ts),
 * which makes Mongoose strip it from update payloads by default — that's the
 * whole point, it stops any *other* code path from ever overwriting an
 * already-assigned code. This script is the one intentional exception, so it
 * passes `overwriteImmutable: true` explicitly on its single write.
 *
 * Dry-run (default, no writes — prints who would get a code):
 *   npx tsx src/scripts/backfillEmployeeCode.ts
 *   npm run backfill:employee-code
 *
 * Apply:
 *   npx tsx src/scripts/backfillEmployeeCode.ts --apply
 *   npm run backfill:employee-code:apply
 *
 * Production env files are `.env.production` / `.env.local` (not `.env`).
 * Point at them explicitly on the VPS, e.g.:
 *   DOTENV_CONFIG_PATH=.env.production npx tsx src/scripts/backfillEmployeeCode.ts --apply
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { withUniqueEmployeeCode } from "@/lib/people/employeeCode";

const APPLY = process.argv.includes("--apply");
const DRY_RUN_PREVIEW_LIMIT = 25;

/**
 * Matches docs that still need a code: field absent, explicit null, or empty.
 * `$exists: false` is required so the sparse unique index cannot hide legacy
 * rows that never had the field set.
 */
const MISSING_EMPLOYEE_CODE_FILTER = {
  $or: [
    { employeeCode: { $exists: false } },
    { employeeCode: null },
    { employeeCode: "" },
  ],
};

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function loadScriptEnv(): void {
  const names = [".env.production", ".env.local", ".env"];
  const uniquePaths: string[] = [];

  if (process.env.DOTENV_CONFIG_PATH) {
    uniquePaths.push(path.resolve(process.env.DOTENV_CONFIG_PATH));
  }

  for (const name of names) {
    const filePath = path.resolve(process.cwd(), name);
    if (!uniquePaths.includes(filePath)) uniquePaths.push(filePath);
  }

  for (const filePath of uniquePaths) {
    if (!fileExists(filePath)) continue;
    dotenv.config({ path: filePath, override: false });
  }

  if (!process.env.MONGO_DB_URL?.trim() && process.env.MONGODB_URI?.trim()) {
    process.env.MONGO_DB_URL = process.env.MONGODB_URI;
  }
}

loadScriptEnv();

class AlreadyAssignedError extends Error {
  constructor() {
    super("employeeCode already assigned by a concurrent run");
  }
}

function employeeLabel(employee: { _id: unknown; email?: string | null }): string {
  return employee.email || String(employee._id);
}

async function main(): Promise<void> {
  await connectDb();

  const cursor = Employees.find(MISSING_EMPLOYEE_CODE_FILTER)
    .select("_id email")
    .cursor();

  let scanned = 0;
  let assigned = 0;
  let failed = 0;
  const dryRunPreview: string[] = [];

  for await (const employee of cursor) {
    scanned++;
    const label = employeeLabel(employee);

    if (!APPLY) {
      if (dryRunPreview.length < DRY_RUN_PREVIEW_LIMIT) {
        dryRunPreview.push(label);
      }
      continue;
    }

    try {
      await withUniqueEmployeeCode(async (code) => {
        const result = await Employees.updateOne(
          { _id: employee._id, ...MISSING_EMPLOYEE_CODE_FILTER },
          { $set: { employeeCode: code } },
          { overwriteImmutable: true },
        );
        if (result.matchedCount === 0) {
          // Someone else (e.g. a concurrent run) already assigned a code —
          // not a collision, nothing to retry, just move on.
          throw new AlreadyAssignedError();
        }
        return result;
      });
      assigned++;
    } catch (error) {
      if (error instanceof AlreadyAssignedError) continue;
      failed++;
      console.error(
        `Failed to assign employeeCode for ${label}:`,
        error,
      );
    }
  }

  console.log("=== Employee code backfill ===");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN (no writes)"}`);
  console.log(`Employees missing employeeCode: ${scanned}`);

  if (APPLY) {
    console.log(`Assigned: ${assigned}`);
    console.log(`Failed: ${failed}`);
    return;
  }

  if (dryRunPreview.length > 0) {
    console.log("");
    console.log(`Would assign a ZI-XXXXXX code to (first ${dryRunPreview.length}):`);
    for (const label of dryRunPreview) {
      console.log(`  - ${label}`);
    }
    if (scanned > dryRunPreview.length) {
      console.log(`  … ${scanned - dryRunPreview.length} more`);
    }
  }

  console.log("");
  console.log("No codes were written. Re-run with --apply to assign them:");
  console.log("  npm run backfill:employee-code:apply");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
