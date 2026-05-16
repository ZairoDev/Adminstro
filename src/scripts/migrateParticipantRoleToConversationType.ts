/**
 * One-time migration: copy participantRole → conversationType, then remove participantRole.
 *
 * Run: npx tsx src/scripts/migrateParticipantRoleToConversationType.ts
 */
import "dotenv/config";

import mongoose from "mongoose";

import WhatsAppConversation from "../models/whatsappConversation";
import { connectDb } from "../util/db";

async function main(): Promise<void> {
  await connectDb();

  const collection = WhatsAppConversation.collection;

  // Copy participantRole into conversationType when conversationType is missing
  const copyResult = await collection.updateMany(
    {
      participantRole: { $in: ["owner", "guest"] },
      $or: [
        { conversationType: { $exists: false } },
        { conversationType: null },
        { conversationType: "" },
      ],
    },
    [
      {
        $set: {
          conversationType: "$participantRole",
        },
      },
    ],
  );

  console.log(
    `[migrate] Copied participantRole → conversationType on ${copyResult.modifiedCount} document(s)`,
  );

  // Remove legacy field from all documents that still have it
  const unsetResult = await collection.updateMany(
    { participantRole: { $exists: true } },
    { $unset: { participantRole: "" } },
  );

  console.log(
    `[migrate] Removed participantRole from ${unsetResult.modifiedCount} document(s)`,
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
