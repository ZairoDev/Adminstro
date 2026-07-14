import Candidate from "@/models/candidate";
import OfficeAddress from "@/models/officeAddress";
import { seedDefaultOffices } from "./seedDefaultOffices";

/**
 * Backfill officeAddressId for candidates that only have officeLocation (Kanpur/Noida).
 */
export async function backfillCandidateOfficeAddresses(): Promise<{
  matched: number;
  updated: number;
}> {
  await seedDefaultOffices();
  const offices = await OfficeAddress.find({ isActive: true }).lean();
  let matched = 0;
  let updated = 0;

  for (const office of offices) {
    const city = String(office.city || "").trim();
    if (!city) continue;

    const filter = {
      officeAddressId: { $in: [null, undefined] },
      officeLocation: new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    };
    matched += await Candidate.countDocuments(filter);
    const result = await Candidate.updateMany(filter, {
      $set: {
        officeAddressId: office._id,
        officeLocation: city,
      },
    });
    updated += result.modifiedCount || 0;
  }

  return { matched, updated };
}
