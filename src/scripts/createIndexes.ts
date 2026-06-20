import "dotenv/config";

import mongoose from "mongoose";

import { connectDb } from "../util/db";

// Side-effect imports register schema indexes on each model
import "../models/query";
import "../models/visit";
import "../models/booking";
import "../models/property";
import "../models/propertyBooster";
import "../models/employee";

async function main(): Promise<void> {
  await connectDb();
  console.log("Ensuring indexes...");
  await mongoose.connection.syncIndexes();
  console.log("Indexes synced.");
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
