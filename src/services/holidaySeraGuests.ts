import type { PipelineStage } from "mongoose";

import {
  buildOwnerJourneyHolidayUserOnly,
  type HolidayUserLike,
  type VsIdRef,
} from "@/lib/owner-journey";
import { holidayUserRootPropertyLookupStages } from "@/lib/owner-journey/pipelines";
import HolidayUsers from "@/models/holidayUsers";
import type { HolidaySeraGuestListItem } from "@/types/holidaySeraGuests";
import { connectDb } from "@/util/db";

export const HOLIDAY_SERA_GUESTS_PAGE_SIZE = 20;

export type { HolidaySeraGuestListItem };

type AggregatedHolidayUserDoc = Record<string, unknown> & {
  _id: { toString: () => string };
  holidayVsids?: VsIdRef[];
  holidayVsids2?: VsIdRef[];
};

function displayName(doc: {
  name?: string;
  firstName?: string;
  lastName?: string;
}): string {
  if (doc.name?.trim()) return doc.name.trim();
  const parts = [doc.firstName, doc.lastName].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  return parts.join(" ").trim() || "—";
}

function mapAggregatedDocToGuest(d: AggregatedHolidayUserDoc): HolidaySeraGuestListItem {
  const holidayLike: HolidayUserLike = {
    role: typeof d.role === "string" ? d.role : null,
    isProfileComplete: d.isProfileComplete !== false,
    subscription: d.subscription as HolidayUserLike["subscription"],
    Payment: d.Payment as HolidayUserLike["Payment"],
  };

  const ownerJourney = buildOwnerJourneyHolidayUserOnly(
    holidayLike,
    d.holidayVsids,
    d.holidayVsids2,
  );

  const id = d._id.toString();
  const name = displayName({
    name: d.name as string | undefined,
    firstName: d.firstName as string | undefined,
    lastName: d.lastName as string | undefined,
  });

  return {
    _id: id,
    name,
    email: String(d.email ?? ""),
    phone: String(d.phone ?? ""),
    address: String(d.address ?? ""),
    profilePic: String(d.profilePic ?? ""),
    role: String(d.role ?? "Owner"),
    firstName: typeof d.firstName === "string" ? d.firstName : undefined,
    lastName: typeof d.lastName === "string" ? d.lastName : undefined,
    isVerified: d.isVerified === true,
    vsids: d.holidayVsids,
    vsids2: d.holidayVsids2,
    ownerJourney,
    createdAt:
      d.createdAt instanceof Date
        ? d.createdAt.toISOString()
        : typeof d.createdAt === "string"
          ? d.createdAt
          : undefined,
    updatedAt:
      d.updatedAt instanceof Date
        ? d.updatedAt.toISOString()
        : typeof d.updatedAt === "string"
          ? d.updatedAt
          : undefined,
  };
}

function buildSearchMatch(search: string): Record<string, unknown> | null {
  const q = search.trim();
  if (!q) return null;
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");
  return {
    $or: [
      { name: regex },
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ],
  };
}

export async function countHolidaySeraOwners(search: string): Promise<number> {
  await connectDb();
  const base: Record<string, unknown> = { role: "Owner" };
  const sm = buildSearchMatch(search);
  const query = sm ? { $and: [base, sm] } : base;
  return HolidayUsers.countDocuments(query);
}

export async function listHolidaySeraOwners(params: {
  page: number;
  search: string;
}): Promise<{ items: HolidaySeraGuestListItem[]; total: number }> {
  await connectDb();
  const { page, search } = params;
  const skip = Math.max(0, (page - 1) * HOLIDAY_SERA_GUESTS_PAGE_SIZE);

  const baseMatch: Record<string, unknown> = { role: "Owner" };
  const sm = buildSearchMatch(search);
  const match: Record<string, unknown> = sm ? { $and: [baseMatch, sm] } : baseMatch;

  const pipeline: PipelineStage[] = [
    { $match: match },
    { $sort: { _id: -1 } },
    { $skip: skip },
    { $limit: HOLIDAY_SERA_GUESTS_PAGE_SIZE },
    ...holidayUserRootPropertyLookupStages(),
  ];

  const raw = await HolidayUsers.aggregate(pipeline);
  const total = await countHolidaySeraOwners(search);

  const items = raw.map((doc) => mapAggregatedDocToGuest(doc as AggregatedHolidayUserDoc));

  return { items, total };
}
