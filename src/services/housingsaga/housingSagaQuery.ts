import HousingSagaQuery, {
  type IHousingSagaQuery,
} from "@/models/housingSagaQuery";
import type {
  HousingSagaQueryInput,
  HousingSagaQueryView,
} from "@/schemas/housingSagaQuery.schema";

const DUPLICATE_WINDOW_DAYS = 30;

export type CreateHousingSagaQueryResult =
  | { ok: true; data: HousingSagaQueryView }
  | { ok: false; status: number; error: string };

function toView(doc: IHousingSagaQuery): HousingSagaQueryView {
  return {
    _id: String(doc._id),
    name: doc.name,
    email: doc.email,
    phoneNo: doc.phoneNo,
    typeOfProperty: doc.typeOfProperty,
    country: doc.country,
    city: doc.city,
    location: doc.location,
    minBudget: doc.minBudget,
    maxBudget: doc.maxBudget,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date().toISOString(),
  };
}

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export async function phoneExistsInHousingSagaQueries(
  phoneNo: string,
): Promise<boolean> {
  const existing = await HousingSagaQuery.findOne({ phoneNo })
    .sort({ createdAt: -1 })
    .select("createdAt");

  if (!existing?.createdAt) return false;
  return daysSince(existing.createdAt) <= DUPLICATE_WINDOW_DAYS;
}

export async function createHousingSagaQuery(
  input: HousingSagaQueryInput,
  createdBy: string,
): Promise<CreateHousingSagaQueryResult> {
  const phoneTaken = await phoneExistsInHousingSagaQueries(input.phoneNo);
  if (phoneTaken) {
    return {
      ok: false,
      status: 400,
      error: "Phone number already exists",
    };
  }

  const created = await HousingSagaQuery.create({
    name: input.name,
    email: input.email.toLowerCase(),
    phoneNo: input.phoneNo,
    typeOfProperty: input.typeOfProperty,
    country: input.country,
    city: input.city,
    location: input.location,
    minBudget: input.minBudget,
    maxBudget: input.maxBudget,
    createdBy: createdBy.toLowerCase(),
  });

  return { ok: true, data: toView(created) };
}

export async function listHousingSagaQueries(params: {
  createdBy?: string | string[];
  page: number;
  limit: number;
}): Promise<{ data: HousingSagaQueryView[]; total: number; totalPages: number }> {
  const createdByList = Array.isArray(params.createdBy)
    ? params.createdBy.map((email) => email.toLowerCase()).filter(Boolean)
    : [];
  const filter = Array.isArray(params.createdBy)
    ? { createdBy: { $in: createdByList } }
    : params.createdBy
      ? { createdBy: params.createdBy.toLowerCase() }
      : {};

  const skip = (params.page - 1) * params.limit;
  const [docs, total] = await Promise.all([
    HousingSagaQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit),
    HousingSagaQuery.countDocuments(filter),
  ]);

  return {
    data: docs.map((doc) => toView(doc)),
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}
