/**
 * Sync availability from unregisteredOwner → properties & dummy
 * Match condition: VSID
 *
 * Run with:
 * node syncAvailabilityFixed.js
 */

const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_DB_URL; 
const DB_NAME = process.env.MONGO_DB_NAME;

async function syncAvailability() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("✓ Connected to MongoDB");

    const db = client.db(DB_NAME);

    const unregisteredOwnerCol = db.collection("unregisteredowners");
    const propertiesCol = db.collection("properties");
    const dummyCol = db.collection("dummy");

    console.log(
      `✓ Connected to collection: ${unregisteredOwnerCol.collectionName}`
    );
    console.log("Fetching unregisteredOwner records...");

    // More lenient query - just check if fields exist
    const owners = await unregisteredOwnerCol
      .find(
        {
          VSID: { $exists: true },
          availability: { $exists: true },
        },
        {
          projection: { VSID: 1, availability: 1, name: 1 },
        }
      )
      .toArray();

    console.log(`Raw query returned ${owners.length} documents`);

    if (!owners.length) {
      console.log("⚠ No unregisteredOwner records found.");

      // Try to get total count to help debug
      const totalCount = await unregisteredOwnerCol.countDocuments();
      console.log(`Total documents in collection: ${totalCount}`);

      // Check for VSID field
      const withVSID = await unregisteredOwnerCol.countDocuments({
        VSID: { $exists: true },
      });
      console.log(`Documents with VSID: ${withVSID}`);

      return;
    }

    console.log(`Found ${owners.length} unregisteredOwner records`);
    console.log("\nFirst 3 records:");
    owners.slice(0, 3).forEach((owner, idx) => {
      console.log(
        `  ${idx + 1}. VSID: "${
          owner.VSID
        }" (${typeof owner.VSID}), availability: "${
          owner.availability
        }", name: ${owner.name}`
      );
    });

    let propertiesMatched = 0;
    let propertiesUpdated = 0;
    let dummyMatched = 0;
    let dummyUpdated = 0;
    let skipped = 0;
    let notFoundVSIDs = [];
    let processed = 0;

    console.log("\nStarting sync...\n");

    for (const owner of owners) {
      processed++;

      // Get VSID and handle various formats
      let VSID = owner.VSID;

      // Skip if VSID is null, undefined, or empty
      if (!VSID) {
        console.log(
          `⚠ [${processed}/${owners.length}] Skipping: VSID is ${VSID}`
        );
        skipped++;
        continue;
      }

      // Trim if it's a string
      if (typeof VSID === "string") {
        VSID = VSID.trim();
      }

      // Skip if empty after trimming
      if (!VSID || VSID === "") {
        console.log(
          `⚠ [${processed}/${owners.length}] Skipping: VSID is empty after trim`
        );
        skipped++;
        continue;
      }

      const availability = owner.availability;

      // Skip if availability is null or undefined
      if (!availability) {
        console.log(
          `⚠ [${processed}/${owners.length}] Skipping VSID ${VSID}: availability is ${availability}`
        );
        skipped++;
        continue;
      }

      try {
        // Update properties collection
        const propResult = await propertiesCol.updateMany(
          { VSID: VSID },
          { $set: { availability: availability } }
        );

        // Update dummy collection
        const dummyResult = await dummyCol.updateMany(
          { VSID: VSID },
          { $set: { availability: availability } }
        );

        propertiesMatched += propResult.matchedCount;
        propertiesUpdated += propResult.modifiedCount;
        dummyMatched += dummyResult.matchedCount;
        dummyUpdated += dummyResult.modifiedCount;

        // Track VSIDs not found in either collection
        if (propResult.matchedCount === 0 && dummyResult.matchedCount === 0) {
          notFoundVSIDs.push(VSID);
          console.log(
            `⚠ [${processed}/${owners.length}] VSID not found: ${VSID} (${owner.name})`
          );
        } else {
          console.log(
            `✓ [${processed}/${owners.length}] Updated VSID ${VSID}: properties=${propResult.matchedCount}, dummy=${dummyResult.matchedCount}`
          );
        }
      } catch (updateError) {
        console.error(
          `❌ [${processed}/${owners.length}] Error updating VSID ${VSID}:`,
          updateError.message
        );
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("✓ Availability sync completed");
    console.log("=".repeat(60));
    console.log(`Total records processed: ${processed}`);
    console.log(`Skipped (invalid): ${skipped}`);
    console.log(
      `Properties - Matched: ${propertiesMatched}, Updated: ${propertiesUpdated}`
    );
    console.log(`Dummy - Matched: ${dummyMatched}, Updated: ${dummyUpdated}`);

    if (notFoundVSIDs.length > 0) {
      console.log(
        `\n⚠ ${notFoundVSIDs.length} VSIDs not found in any collection:`
      );
      console.log(notFoundVSIDs.slice(0, 20).join(", "));
      if (notFoundVSIDs.length > 20) {
        console.log(`... and ${notFoundVSIDs.length - 20} more`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    console.log(
      `  ✓ Successfully synced: ${
        propertiesMatched + dummyMatched
      } total matches`
    );
    console.log(`  ⚠ Not found: ${notFoundVSIDs.length}`);
    console.log(`  ⚠ Skipped: ${skipped}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Availability sync failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n✓ Database connection closed");
  }
}

// Run the sync
syncAvailability().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
