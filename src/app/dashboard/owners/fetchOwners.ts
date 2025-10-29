import { connectDb } from "@/util/db";
import { Owners } from "@/models/owner";
import { OwnerInterface } from "@/util/type";

connectDb();

// Define the lean document type locally
type OwnerLeanDoc = {
  _id: any;
  phoneNumber: number;
  email?: string;
  propertyName: string;
  propertyUrl: string;
  propertyAlreadyAvailableOn: string[];
  country: string;
  state: string;
  city: string;
  area: string;
  disposition?: string;
  note?: string;
  callback?: string;
};

export async function FetchOwners(page?: number) {
  const LIMIT = 5;
  const SKIP = ((page ?? 1) - 1) * LIMIT;

  const ownerDocs = await Owners.find()
    .skip(SKIP)
    .limit(LIMIT)
    .lean<OwnerLeanDoc[]>();

  const owners: OwnerInterface[] = ownerDocs.map((owner) => ({
    _id: owner._id?.toString(),
    phoneNumber: owner.phoneNumber,
    email: owner.email,
    propertyUrl: owner.propertyUrl,
    propertyName: owner.propertyName,
    propertyAlreadyAvailableOn: owner.propertyAlreadyAvailableOn,
    country: owner.country,
    state: owner.state,
    city: owner.city,
    area: owner.area,
    disposition: owner.disposition,
    note: owner.note,
    callback: owner.callback,
  }));

  const totalOwners = await Owners.countDocuments({});
  const totalPages = Math.ceil(totalOwners / LIMIT);

  return { owners, totalPages, totalOwners };
}

export async function fetchOwnerById(id: string): Promise<OwnerInterface> {
  const ownerDoc = await Owners.findById(id).lean<OwnerLeanDoc>();

  if (!ownerDoc) {
    throw new Error("Owner not found");
  }

  const owner: OwnerInterface = {
    _id: ownerDoc._id?.toString(),
    phoneNumber: ownerDoc.phoneNumber,
    email: ownerDoc.email,
    propertyUrl: ownerDoc.propertyUrl,
    propertyName: ownerDoc.propertyName,
    propertyAlreadyAvailableOn: ownerDoc.propertyAlreadyAvailableOn,
    country: ownerDoc.country,
    state: ownerDoc.state,
    city: ownerDoc.city,
    area: ownerDoc.area,
    disposition: ownerDoc.disposition,
    note: ownerDoc.note,
    callback: ownerDoc.callback,
  };

  return owner;
}
