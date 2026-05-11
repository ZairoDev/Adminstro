import "dotenv/config";

import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { generateMobilePin } from "@/util/generateMobilePin";

async function main() {
  await connectDb();

  const cursor = Employees.find({
    $or: [
      { mobilePin: { $exists: false } },
      { mobilePin: null },
      { mobilePin: "" },
      { mobilePin: { $not: /^\d{4}$/ } },
    ],
  })
    .select("_id email mobilePin")
    .lean()
    .cursor();

  const ops: any[] = [];
  let scanned = 0;
  let updated = 0;

  for await (const emp of cursor) {
    scanned++;
    const newPin = generateMobilePin(4);
    ops.push({
      updateOne: {
        filter: { _id: emp._id },
        update: { $set: { mobilePin: newPin } },
      },
    });
    updated++;

    if (ops.length >= 500) {
      await Employees.bulkWrite(ops, { ordered: false });
      ops.length = 0;
    }
  }

  if (ops.length) {
    await Employees.bulkWrite(ops, { ordered: false });
  }

  // eslint-disable-next-line no-console
  console.log(
    `✅ generateMissingEmployeeMobilePins: scanned=${scanned} updated=${updated}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("❌ generateMissingEmployeeMobilePins failed:", err);
    process.exit(1);
  });

