import { MonthlyTarget } from "@/models/monthlytarget";
import { normalizeCityKey } from "@/lib/city-normalizer";

const SALES_BOARD_ROLES = new Set(["Sales", "Sales-TeamLead"]);

export type LeadApprovalStamp = {
  approvalRequired?: boolean;
  leadQualityByTeamLead?: string | null;
  location?: string | null;
};

/** Sales fresh boards hide leads that still need team-lead approval. */
export function salesBoardHidesUnapprovedLeads(role: string): boolean {
  return SALES_BOARD_ROLES.has(role.trim());
}

export async function getApprovalRequiredCityKeys(): Promise<string[]> {
  const rows = await MonthlyTarget.find({
    month: { $exists: false },
    requireLeadApproval: true,
  })
    .select("city")
    .lean<Array<{ city?: string }>>();

  const keys = new Set<string>();
  for (const row of rows) {
    const key = normalizeCityKey(row.city || "");
    if (key) keys.add(key);
  }
  return Array.from(keys);
}

export async function locationRequiresLeadApproval(
  location: string,
): Promise<boolean> {
  const key = normalizeCityKey(location || "");
  if (!key) return false;
  const keys = await getApprovalRequiredCityKeys();
  return keys.includes(key);
}

/** Held while the city gate is still on and the team lead has not approved. */
export function isHeldLead(
  lead: LeadApprovalStamp,
  cityKeys: string[],
): boolean {
  if (lead.approvalRequired !== true) return false;
  if (lead.leadQualityByTeamLead === "Approved") return false;
  if (cityKeys.length === 0) return false;
  const key = normalizeCityKey(lead.location || "");
  return cityKeys.includes(key);
}

/**
 * Mongo filter that keeps every lead except ones currently held.
 * Null when no city requires approval, so callers can skip the clause.
 */
export function releasedLeadFilter(
  cityKeys: string[],
): Record<string, unknown> | null {
  if (cityKeys.length === 0) return null;
  return {
    $or: [
      { approvalRequired: { $ne: true } },
      { leadQualityByTeamLead: "Approved" },
      {
        $expr: {
          $not: {
            $in: [
              {
                $toLower: {
                  $trim: { input: { $ifNull: ["$location", ""] } },
                },
              },
              cityKeys,
            ],
          },
        },
      },
    ],
  };
}

export async function getReleasedLeadFilter(): Promise<Record<string, unknown> | null> {
  const keys = await getApprovalRequiredCityKeys();
  return releasedLeadFilter(keys);
}

export function mergeReleasedLeadFilter(
  match: Record<string, unknown>,
  filter: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!filter) return match;
  const existing = Array.isArray(match.$and) ? match.$and : [];
  return {
    ...match,
    $and: [...existing, filter],
  };
}
