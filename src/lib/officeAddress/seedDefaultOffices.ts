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
 * Bootstrap defaults when the collection is empty, keep Kanpur address in sync,
 * and ensure exactly one office is marked as the legal registered office.
 */
export async function seedDefaultOffices() {
  const kanpurDefault = DEFAULT_OFFICES.find((o) => o.name === "Kanpur Office");
  if (kanpurDefault) {
    const existingKanpur = await OfficeAddress.findOne({ name: "Kanpur Office" });
    if (existingKanpur) {
      existingKanpur.addressLine1 = kanpurDefault.addressLine1;
      existingKanpur.addressLine2 = kanpurDefault.addressLine2 || null;
      existingKanpur.city = kanpurDefault.city;
      existingKanpur.state = kanpurDefault.state;
      existingKanpur.pincode = kanpurDefault.pincode;
      existingKanpur.country = kanpurDefault.country;
      existingKanpur.formattedAddress = formatOfficeAddress(kanpurDefault);
      await existingKanpur.save();
      await setRegisteredOffice(existingKanpur._id.toString());
    }
  }

  const count = await OfficeAddress.countDocuments();
  if (count > 0) {
    // Collection already bootstrapped — still ensure a registered office exists
    const hasRegistered = await OfficeAddress.exists({ isRegisteredOffice: true });
    if (!hasRegistered && kanpurDefault) {
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
