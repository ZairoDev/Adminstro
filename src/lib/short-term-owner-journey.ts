import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";
import { Properties } from "@/models/property";
import Users from "@/models/user";
import { computeShortTermOwnerReadiness } from "@/lib/short-term-owner-readiness";
import { resolveShortTermDraft } from "@/lib/resolve-short-term-draft";

export type SheetRowLike = {
  _id: unknown;
  ownerUserId?: string;
  propertyMongoId?: string;
  advertListingStatus?: string;
  VSID?: string;
};

export async function buildShortTermOwnerJourneyFromSheetRow(
  sheetRow: SheetRowLike,
) {
  const ownerUserId = String(sheetRow.ownerUserId ?? "").trim();
  const propertyMongoId = String(sheetRow.propertyMongoId ?? "").trim();

  const user = ownerUserId
    ? await Users.findById(ownerUserId)
        .select(
          "name email phone address nationality bankDetails isProfileComplete ownerProfileCompletedAt",
        )
        .lean()
    : null;

  const property = propertyMongoId
    ? await Properties.findById(propertyMongoId).lean()
    : null;

  const readiness = computeShortTermOwnerReadiness({
    sheetRow,
    user: user as Parameters<typeof computeShortTermOwnerReadiness>[0]["user"],
    property: property as Parameters<
      typeof computeShortTermOwnerReadiness
    >[0]["property"],
  });

  return {
    ownerSheetId: String(sheetRow._id),
    owner: user
      ? {
          _id: String((user as { _id?: unknown })._id),
          name: (user as { name?: string }).name,
          email: (user as { email?: string }).email,
        }
      : null,
    property: property
      ? {
          _id: String((property as { _id?: unknown })._id),
          VSID: (property as { VSID?: string }).VSID,
          isLive: (property as { isLive?: boolean }).isLive,
        }
      : null,
    advertListingStatus: sheetRow.advertListingStatus,
    ...readiness,
  };
}

export async function buildShortTermOwnerJourneyBySheetId(sheetId: string) {
  const sheetRow = (await unregisteredOwnerShortTerm
    .findById(sheetId)
    .lean()) as SheetRowLike | null;
  if (!sheetRow) return null;
  return buildShortTermOwnerJourneyFromSheetRow(sheetRow);
}

export async function buildShortTermOwnerJourneyByUserId(userId: string) {
  const user = await Users.findById(userId).select("email phone").lean();
  if (!user) return null;

  const email = String((user as { email?: string }).email ?? "");
  const phone = String((user as { phone?: string }).phone ?? "");

  const resolved = await resolveShortTermDraft({
    userId,
    ownerEmail: email,
    ownerPhone: phone,
  });

  if (resolved.sheetRow) {
    const fullRow = (await unregisteredOwnerShortTerm
      .findById(resolved.ownerSheetId)
      .lean()) as SheetRowLike | null;
    if (fullRow) return buildShortTermOwnerJourneyFromSheetRow(fullRow);
  }

  const linkedRow = (await unregisteredOwnerShortTerm
    .findOne({ ownerUserId: userId })
    .sort({ createdAt: -1 })
    .lean()) as SheetRowLike | null;

  if (!linkedRow) return null;
  return buildShortTermOwnerJourneyFromSheetRow(linkedRow);
}
