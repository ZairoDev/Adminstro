/**
 * One-time backfill: assigns a permanent ZI-XXXXXX employeeCode to every
 * Employees document created before this feature existed.
 *
 * Idempotent / safe to re-run: only touches documents where employeeCode is
 * still unset, so an interrupted run can simply be re-run to finish the job,
 * and running it again after completion is a no-op.
 *
 * `employeeCode` is `immutable: true` on the schema (see src/models/employee.ts),
 * which makes Mongoose strip it from update payloads by default — that's the
 * whole point, it stops any *other* code path from ever overwriting an
 * already-assigned code. This script is the one intentional exception, so it
 * passes `overwriteImmutable: true` explicitly on its single write.
 *
 * Dry-run (default, no writes):
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
import "dotenv/config";

import { connectDb } from "@/util/db";
import Employees from "@/models/employee";
import { withUniqueEmployeeCode } from "@/lib/people/employeeCode";

const APPLY = process.argv.includes("--apply");

class AlreadyAssignedError extends Error {
  constructor() {
    super("employeeCode already assigned by a concurrent run");
  }
}

async function main(): Promise<void> {
  await connectDb();

  const cursor = Employees.find({ employeeCode: null })
    .select("_id email")
    .cursor();

  let scanned = 0;
  let assigned = 0;
  let failed = 0;

  for await (const employee of cursor) {
    scanned++;

    if (!APPLY) continue;

    try {
      await withUniqueEmployeeCode(async (code) => {
        const result = await Employees.updateOne(
          { _id: employee._id, employeeCode: null },
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
        `Failed to assign employeeCode for ${employee.email || employee._id}:`,
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
  } else {
    console.log("Re-run with --apply to assign codes.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
