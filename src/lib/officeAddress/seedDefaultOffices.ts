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
 * Bootstrap defaults only when the collection is empty.
 * Never recreates offices that were renamed or deleted — callers used to
 * upsert-by-name on every list load, which made delete/rename look broken.
 */
export async function seedDefaultOffices() {
  const count = await OfficeAddress.countDocuments();
  if (count > 0) {
    return [];
  }

  const results = [];
  for (const office of DEFAULT_OFFICES) {
    const formattedAddress = formatOfficeAddress(office);
    const doc = await OfficeAddress.create({
      ...office,
      addressLine2: office.addressLine2 || null,
      formattedAddress,
      isActive: true,
    });
    results.push(doc);
  }
  return results;
}
