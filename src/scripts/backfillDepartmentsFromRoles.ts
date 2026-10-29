import "dotenv/config";

import { connectDb } from "@/util/db";
import Role from "@/models/role";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";
import { findDepartmentByName, findJobPositionByName } from "@/lib/departments/jobIdentity";

/**
 * Copy the flat add-ons roles collection into departments and job positions.
 * Does not read or write employee login roles.
 */
async function run() {
  await connectDb();
  const roles = await Role.find({}).lean();

  let departmentsCreated = 0;
  let positionsCreated = 0;
  let skipped = 0;

  for (const row of roles) {
    const departmentName = String(row.department || "").trim();
    const positionName = String(row.role || "").trim();
    if (!departmentName || !positionName) {
      skipped += 1;
      continue;
    }

    let department = await findDepartmentByName(departmentName);
    if (!department) {
      department = await Department.create({
        name: departmentName,
        isActive: row.isActive !== false,
      });
      departmentsCreated += 1;
    }

    const existingPosition = await findJobPositionByName(department._id, positionName);
    if (existingPosition) {
      skipped += 1;
      continue;
    }

    await JobPosition.create({
      name: positionName,
      departmentId: department._id,
      isActive: row.isActive !== false,
    });
    positionsCreated += 1;
  }

  console.log(
    `Backfill complete. Departments created: ${departmentsCreated}. Positions created: ${positionsCreated}. Rows skipped: ${skipped}. Employee login roles were not changed.`,
  );
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
