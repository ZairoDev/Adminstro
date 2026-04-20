import "dotenv/config";

import mongoose, { type Types } from "mongoose";

import { unregisteredOwner } from "../models/unregisteredOwner";
import { geocodeWithNominatim } from "./helpers/geocodeNominatim";
import { connectDb } from "../util/db";

interface LocationGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

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

function isValidLocationGeo(input: OwnerGeoCandidate["locationGeo"]): input is LocationGeoPoint {
  if (!input || input.type !== "Point" || !Array.isArray(input.coordinates)) {
    return false;
  }

  if (input.coordinates.length !== 2) {
    return false;
  }

  const [lng, lat] = input.coordinates;
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;
  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
  return validLng && validLat;
}

function compactString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function buildAddressCandidates(doc: OwnerGeoCandidate): string[] {
  const address = compactString(doc.address);
  const location = compactString(doc.location);
  const area = compactString(doc.area);

  const candidates = [
    [address, location, area].filter(Boolean).join(", "),
    [address, area].filter(Boolean).join(", "),
    [address, location].filter(Boolean).join(", "),
    address,
    [location, area].filter(Boolean).join(", "),
    location,
    area,
  ]
    .map((query) => query.trim())
    .filter((query) => query.length > 0);

  return [...new Set(candidates)];
}

function shouldLogProgress(processed: number, total: number): boolean {
  return processed % 25 === 0 || processed === total;
}

async function migrateUnregisteredOwnerGeo(): Promise<void> {
  await connectDb();

  await unregisteredOwner.collection.createIndex(
    { locationGeo: "2dsphere" },
    { name: "locationGeo_2dsphere" },
  );

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

    const candidates = buildAddressCandidates(doc);
    if (candidates.length === 0) {
      stats.skippedNoQuery += 1;
      stats.failed += 1;
      console.warn(`No usable address fields for document ${doc._id.toString()}`);
      continue;
    }

    let resolved: LocationGeoPoint | null = null;
    for (const query of candidates) {
      const geo = await geocodeWithNominatim(query, {
        delayMs: 1100,
        maxRetries: 3,
        userAgent: process.env.NOMINATIM_USER_AGENT ?? "admin-property-migration/1.0",
      });

      if (geo) {
        resolved = {
          type: "Point",
          coordinates: [geo.lng, geo.lat],
        };
        break;
      }
    }

    if (!resolved) {
      stats.failed += 1;
      console.warn(
        `Geocoding failed for ${doc._id.toString()} (tried: ${candidates.join(" | ")})`,
      );
      continue;
    }

    await unregisteredOwner.updateOne(
      { _id: doc._id },
      { $set: { locationGeo: resolved } },
    );
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
