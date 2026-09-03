/**
 * One-time migration: map legacy visit statuses to the new lifecycle.
 *
 * Run: npx tsx src/scripts/migrateVisitStatuses.ts
 */
import "dotenv/config";

import { connectDb } from "@/util/db";
import Visits from "@/models/visit";

async function migrateVisitStatuses() {
  await connectDb();

  const rejectedVisits = await Visits.find({ visitStatus: "rejected" }).lean();
  let rejectedMigrated = 0;

  for (const visit of rejectedVisits) {
    await Visits.updateOne(
      { _id: visit._id },
      {
        $set: {
          visitStatus: "completed",
          outcome: "cancelled",
          outcomeReason: visit.rejectionReason ?? visit.outcomeReason,
          completionSource: "system",
        },
      },
    );
    rejectedMigrated += 1;
  }

  const unknownResult = await Visits.updateMany(
    {
      visitStatus: {
        $nin: ["scheduled", "rescheduled", "completed"],
      },
    },
    {
      $set: {
        visitStatus: "scheduled",
        outcome: "none",
      },
    },
  );

  const missingOutcome = await Visits.updateMany(
    { outcome: { $exists: false } },
    { $set: { outcome: "none" } },
  );

  console.log("Visit status migration complete:", {
    rejectedMigrated,
    unknownNormalized: unknownResult.modifiedCount,
    outcomeBackfilled: missingOutcome.modifiedCount,
  });

  process.exit(0);
}

migrateVisitStatuses().catch((error) => {
  console.error("Visit status migration failed:", error);
  process.exit(1);
});
