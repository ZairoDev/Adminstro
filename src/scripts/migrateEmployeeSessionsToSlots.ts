import "dotenv/config";

import mongoose from "mongoose";

import Employees from "../models/employee";
import { connectDb } from "../util/db";
import { WEB_SESSION_DURATION_MS } from "../util/deviceSession";

async function migrateEmployeeSessionsToSlots(): Promise<void> {
  await connectDb();

  const filter = {
    $or: [
      { sessionId: { $exists: true } },
      { sessionStartedAt: { $exists: true } },
      { isLoggedIn: { $exists: true } },
    ],
  };

  const total = await Employees.countDocuments(filter);
  console.log(`Starting employee session-slot migration for ${total} documents.`);

  // Use a pipeline update so we can derive webSession.expiresAt from legacy sessionStartedAt.
  const res = await (Employees.collection as any).updateMany(filter, [
    {
      $set: {
        webSession: {
          sessionId: { $ifNull: ["$sessionId", null] },
          sessionStartedAt: { $ifNull: ["$sessionStartedAt", null] },
          expiresAt: {
            $cond: [
              {
                $and: [
                  { $ne: ["$sessionStartedAt", null] },
                  { $gt: ["$sessionStartedAt", 0] },
                ],
              },
              { $add: ["$sessionStartedAt", WEB_SESSION_DURATION_MS] },
              null,
            ],
          },
          isLoggedIn: { $ifNull: ["$isLoggedIn", false] },
        },
      },
    },
    { $unset: ["sessionId", "sessionStartedAt", "isLoggedIn"] },
  ]);

  console.log("Migration completed.", {
    matched: res?.matchedCount ?? res?.nMatched,
    modified: res?.modifiedCount ?? res?.nModified,
  });
}

migrateEmployeeSessionsToSlots()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("Employee session-slot migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });

