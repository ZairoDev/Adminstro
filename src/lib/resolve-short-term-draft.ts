import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";

export type ShortTermSheetRow = {
  _id: unknown;
  ownerUserId?: string;
  email?: string;
  advertListingStatus?: string;
  name?: string;
};

export interface ResolvedShortTermDraft {
  shortTermDraft: boolean;
  ownerSheetId: string;
  sheetRow: ShortTermSheetRow | null;
}

function normalizeEmail(email: string | undefined | null): string {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Resolve whether a new listing should be created as a short-term owner sheet draft.
 * Matches by explicit flags, ownerUserId, or pending sheet email.
 */
function normalizePhone(phone: string | undefined | null): string {
  return String(phone ?? "").replace(/\D/g, "");
}

export async function resolveShortTermDraft({
  userId,
  ownerEmail,
  ownerPhone,
  explicitDraft,
  explicitOwnerSheetId,
}: {
  userId: string;
  ownerEmail?: string;
  ownerPhone?: string;
  explicitDraft?: boolean;
  explicitOwnerSheetId?: string;
}): Promise<ResolvedShortTermDraft> {
  if (explicitDraft && explicitOwnerSheetId) {
    const sheetRow = (await unregisteredOwnerShortTerm
      .findById(explicitOwnerSheetId)
      .lean()) as ShortTermSheetRow | null;
    return {
      shortTermDraft: true,
      ownerSheetId: explicitOwnerSheetId,
      sheetRow,
    };
  }

  let sheetRow = (await unregisteredOwnerShortTerm
    .findOne({
      ownerUserId: userId,
      advertListingStatus: "pending",
    })
    .lean()) as ShortTermSheetRow | null;

  const emailNorm = normalizeEmail(ownerEmail);
  const phoneNorm = normalizePhone(ownerPhone);

  if (!sheetRow && emailNorm) {
    sheetRow = (await unregisteredOwnerShortTerm
      .findOne({
        advertListingStatus: "pending",
        email: { $regex: new RegExp(`^${emailNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      })
      .lean()) as ShortTermSheetRow | null;
  }

  if (!sheetRow && phoneNorm.length >= 8) {
    const candidates = await unregisteredOwnerShortTerm
      .find({ advertListingStatus: "pending" })
      .select("ownerUserId email phoneNumber name")
      .lean();
    sheetRow =
      (candidates.find(
        (row) => normalizePhone((row as { phoneNumber?: string }).phoneNumber) === phoneNorm,
      ) as ShortTermSheetRow | undefined) ?? null;
  }

  if (sheetRow && !String(sheetRow.ownerUserId ?? "").trim()) {
    await unregisteredOwnerShortTerm.findByIdAndUpdate(sheetRow._id, {
      ownerUserId: userId,
      ...(emailNorm ? { email: ownerEmail?.trim() || emailNorm } : {}),
    });
    sheetRow.ownerUserId = userId;
  }

  if (sheetRow) {
    return {
      shortTermDraft: true,
      ownerSheetId: String(sheetRow._id),
      sheetRow,
    };
  }

  return { shortTermDraft: false, ownerSheetId: "", sheetRow: null };
}
