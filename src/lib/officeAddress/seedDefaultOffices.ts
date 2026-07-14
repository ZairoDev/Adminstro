import OfficeAddress, { formatOfficeAddress } from "@/models/officeAddress";

const DEFAULT_OFFICES = [
  {
    name: "Kanpur Office",
    addressLine1: "117/N/70, Kakadeo Rd, Near Manas Park, Ambedkar Nagar",
    addressLine2: "Navin Nagar, Kakadeo",
    city: "Kanpur",
    state: "Uttar Pradesh",
    pincode: "208025",
    country: "India",
  },
  {
    name: "Noida Office",
    addressLine1: "To be updated — Noida office address",
    addressLine2: "",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    country: "India",
  },
] as const;

/**
 * Ensures Kanpur + Noida seed offices exist. Idempotent.
 * Returns the offices after seeding (existing or newly created).
 */
export async function seedDefaultOffices() {
  const results = [];
  for (const office of DEFAULT_OFFICES) {
    const formattedAddress = formatOfficeAddress(office);
    const doc = await OfficeAddress.findOneAndUpdate(
      { name: office.name },
      {
        $setOnInsert: {
          ...office,
          addressLine2: office.addressLine2 || null,
          formattedAddress,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
    results.push(doc);
  }
  return results;
}
