#!/usr/bin/env node
/**
 * Script: mark-uploaded-as-owner.js
 *
 * Usage:
 *   node scripts/mark-uploaded-as-owner.js --mongoUri="<uri>" [--batchId=<batchId>] [--all] [--dryRun]
 *
 * - --mongoUri: MongoDB connection string. If omitted, will use MONGODB_URI or MONGO_URL env var.
 * - --batchId: optional batchId to limit which uploaded contacts to update.
 * - --all: include inactive contacts (isActive=false). By default only active contacts are updated.
 * - --dryRun: don't perform update, only show how many documents would be changed.
 *
 * Sets retarget contacts' `role` field to "owner" where it's missing or different.
 */
const mongoose = require("mongoose");
const path = require("path");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach((a) => {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      out[k] = v === undefined ? true : v;
    }
  });
  return out;
}

async function main() {
  const args = parseArgs();
  // You can paste your MongoDB URI directly here if you prefer:
  const HARDCODED_MONGO_URI =
    ""; // e.g. "mongodb+srv://user:pass@host/dbname"

  const mongoUri =
    args.mongoUri ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.MONGO_DB_URL ||
    HARDCODED_MONGO_URI;
  if (!mongoUri) {
    console.error("MongoDB URI not provided. Set --mongoUri or MONGODB_URI env var.");
    process.exit(2);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);

  // Use collection directly (avoid requiring TypeScript model file)
  const collectionName = "retargetcontact"; // Mongoose model 'RetargetContact' => collection 'retargetcontacts'
  const collection = mongoose.connection.collection(collectionName);
  console.log("Mongo readyState:", mongoose.connection.readyState);
  try {
    const cols = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    console.log(`Collection "${collectionName}" exists:`, cols.length > 0);
  } catch (err) {
    console.error("Error checking collection existence:", err);
  }

  // Only target documents that do NOT have a role field AND look like uploaded contacts
  // Uploaded contacts have batchId and/or sourceFileName set by the upload pipeline.
  const filter = {
    role: { $exists: false },
    $or: [{ batchId: { $exists: true } }, { sourceFileName: { $exists: true } }],
  };
  if (!args.all) {
    filter.isActive = true;
  }
  if (args.batchId) {
    filter.batchId = String(args.batchId);
  }

  const count = await collection.countDocuments(filter);
  console.log(`Matching documents: ${count}`);
  if (count === 0) {
    await mongoose.disconnect();
    console.log("Nothing to update.");
    return;
  }

  if (args.dryRun) {
    console.log("Dry run enabled. No documents were modified.");
    await mongoose.disconnect();
    return;
  }

  const res = await collection.updateMany(filter, { $set: { role: "owner" } });
  console.log(`Matched: ${res.matchedCount ?? res.matched}, Modified: ${res.modifiedCount ?? res.modified}`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

