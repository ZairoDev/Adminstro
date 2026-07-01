import {
  LEAD_LIST_IST_ADD_FIELDS,
  LEAD_LIST_PROJECTION,
} from "@/lib/leads/leadListFields";

export function buildPagedLeadListPipeline(
  matchQuery: Record<string, unknown>,
  skip: number,
  limit: number,
): Record<string, unknown>[] {
  return [
    { $match: matchQuery },
    { $sort: { updatedAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: LEAD_LIST_PROJECTION },
    { $addFields: LEAD_LIST_IST_ADD_FIELDS },
  ];
}
