import "dotenv/config";

import mongoose, { type Types } from "mongoose";

import { unregisteredOwner } from "../models/unregisteredOwner";
import {
  buildGeocodeQueryCandidates,
  isValidLocationGeo,
  syncLocationGeoForOwner,
} from "../services/unregistered-owner-geocode";
import { connectDb } from "../util/db";

interface OwnerGeoCandidate {
  _id: Types.ObjectId;
  address?: string | null;
  location?: string | null;
  area?: string | null;
  locationGeo?: {
    type?: string;
    coordinates?: number[];
  } | null;
}

interface MigrationStats {
  total: number;
  processed: number;
  skippedExisting: number;
  skippedNoQuery: number;
  updated: number;
  failed: number;
}

function shouldLogProgress(processed: number, total: number): boolean {
  return processed % 25 === 0 || processed === total;
}

async function migrateUnregisteredOwnerGeo(): Promise<void> {
  await connectDb();

  try {
    await unregisteredOwner.collection.createIndex(
      { locationGeo: "2dsphere" },
      { name: "locationGeo_2dsphere", sparse: true },
    );
  } catch (error: unknown) {
    const err = error as { code?: number; codeName?: string };
    if (err.code === 86 || err.codeName === "IndexKeySpecsConflict") {
      console.warn("locationGeo_2dsphere index already exists; continuing migration.");
    } else {
      throw error;
    }
  }

  const total = await unregisteredOwner.countDocuments({});
  const stats: MigrationStats = {
    total,
    processed: 0,
    skippedExisting: 0,
    skippedNoQuery: 0,
    updated: 0,
    failed: 0,
  };

  console.log(`Starting geolocation migration for ${total} documents.`);

  const cursor = unregisteredOwner
    .find(
      {},
      {
        _id: 1,
        address: 1,
        location: 1,
        area: 1,
        locationGeo: 1,
      },
    )
    .sort({ _id: 1 })
    .lean()
    .cursor();

  for await (const rawDoc of cursor) {
    const doc = rawDoc as OwnerGeoCandidate;
    stats.processed += 1;

    if (isValidLocationGeo(doc.locationGeo)) {
      stats.skippedExisting += 1;
      if (shouldLogProgress(stats.processed, stats.total)) {
        console.log(
          `[${stats.processed}/${stats.total}] updated=${stats.updated}, skippedExisting=${stats.skippedExisting}, failed=${stats.failed}`,
        );
      }
      continue;
    }

    const candidates = buildGeocodeQueryCandidates(doc);
    if (candidates.length === 0) {
      stats.skippedNoQuery += 1;
      stats.failed += 1;
      console.warn(
        `No usable address fields for document ${doc._id.toString()}`,
      );
      continue;
    }

    const result = await syncLocationGeoForOwner(doc._id, doc);

    if (result.status !== "updated") {
      stats.failed += 1;
      console.warn(
        `Geocoding failed for ${doc._id.toString()} (tried: ${candidates.join(" | ")})`,
      );
      continue;
    }

    stats.updated += 1;

    if (shouldLogProgress(stats.processed, stats.total)) {
      console.log(
        `[${stats.processed}/${stats.total}] updated=${stats.updated}, skippedExisting=${stats.skippedExisting}, failed=${stats.failed}`,
      );
    }
  }

  console.log("Migration completed.");
  console.log(
    JSON.stringify(
      {
        total: stats.total,
        processed: stats.processed,
        updated: stats.updated,
        skippedExisting: stats.skippedExisting,
        skippedNoQuery: stats.skippedNoQuery,
        failed: stats.failed,
      },
      null,
      2,
    ),
  );
}

migrateUnregisteredOwnerGeo()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("Geo migration failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
