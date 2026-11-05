import OfficeAddress, { formatOfficeAddress } from "@/models/officeAddress";
import { setRegisteredOffice } from "@/lib/officeAddress/resolveRegisteredOfficeAddress";

const DEFAULT_OFFICES = [
  {
    name: "Kanpur Office",
    addressLine1: "117/N/70, 3rd Floor",
    addressLine2: "Navin Nagar, Kakadeo",
    city: "Kanpur",
    state: "Uttar Pradesh",
    pincode: "208025",
    country: "India",
    isRegisteredOffice: true,
  },
  {
    name: "Noida Office",
    addressLine1: "To be updated — Noida office address",
    addressLine2: "",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    country: "India",
    isRegisteredOffice: false,
  },
] as const;

/**
 * Create Kanpur and Noida only when the collection is empty.
 * If offices already exist and none is the registered office, mark Kanpur
 * when it is present. A saved address is left as stored.
 */
export async function seedDefaultOffices() {
  const count = await OfficeAddress.countDocuments();
  if (count > 0) {
    const hasRegistered = await OfficeAddress.exists({ isRegisteredOffice: true });
    if (!hasRegistered) {
      const kanpur = await OfficeAddress.findOne({ name: "Kanpur Office" });
      if (kanpur) {
        await setRegisteredOffice(kanpur._id.toString());
      }
    }
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
      isRegisteredOffice: Boolean(office.isRegisteredOffice),
    });
    results.push(doc);
  }

  const registered = results.find((d) => d.isRegisteredOffice);
  if (registered) {
    await setRegisteredOffice(registered._id.toString());
  }

  return results;
}
