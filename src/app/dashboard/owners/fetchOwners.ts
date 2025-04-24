import { connectDb } from "@/util/db";
import { Owners } from "@/models/owner";
import { OwnerInterface } from "@/util/type";

connectDb();

export async function FetchOwners(page?: number) {
  const LIMIT = 5;
  const SKIP = ((page ?? 1) - 1) * LIMIT;

  const ownerDocs = await Owners.find().skip(SKIP).limit(LIMIT).lean();
  const owners: OwnerInterface[] = ownerDocs.map((owner) => ({
    _id: owner?._id?.toString(),
    phoneNumber: owner.phoneNumber,
    propertyUrl: owner.propertyUrl,
    propertyName: owner.propertyName,
    country: owner.country,
    state: owner.state,
    city: owner.city,
    area: owner.area,
  }));
  const totalOwners = await Owners.countDocuments({});
  const totalPages = Math.ceil(totalOwners / LIMIT);

  return { owners, totalPages, totalOwners };
}

export async function fetchOwnerById(id: string) {
  const ownerDoc = (await Owners.findById(id).lean()) as OwnerInterface;
  const owner: OwnerInterface = {
    _id: ownerDoc?._id?.toString(),
    phoneNumber: ownerDoc.phoneNumber,
    propertyUrl: ownerDoc.propertyUrl,
    propertyName: ownerDoc.propertyName,
    country: ownerDoc.country,
    state: ownerDoc.state,
    city: ownerDoc.city,
    area: ownerDoc.area,
  };
  if (!ownerDoc) {
    throw new Error("Owner not found");
  }
  return owner;
}
