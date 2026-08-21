import "dotenv/config";

import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import Employees from "@/models/employee";

async function run() {
  await connectDb();
  // Find all candidates that have an employeeId but whose linked employee has no candidateId
  const linked = await Candidate.find({
    employeeId: { $ne: null },
  }).select("_id employeeId").lean();

  let updated = 0;
  for (const c of linked) {
    const result = await Employees.findByIdAndUpdate(
      c.employeeId,
      { $set: { candidateId: c._id } },
      { new: false },
    );
    if (result) updated++;
  }
  console.log(`Backfilled ${updated} employee records`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
