const STORAGE_KEY = "shortTermOwnerDraftContext";

export interface AddListingDraftContext {
  userId: string;
  ownerSheetId: string;
  shortTermDraft: boolean;
}

export function saveAddListingDraftContext(ctx: AddListingDraftContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

export function readAddListingDraftContext(
  userId?: string | null,
): AddListingDraftContext | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AddListingDraftContext;
    if (parsed.userId !== userId || !parsed.ownerSheetId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAddListingDraftContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function addListingWizardQuery(
  userId: string | null,
): Record<string, string> {
  const query: Record<string, string> = {};
  if (userId) query.userId = userId;
  const ctx = readAddListingDraftContext(userId);
  if (ctx?.shortTermDraft && ctx.ownerSheetId) {
    query.ownerSheetId = ctx.ownerSheetId;
    query.shortTermDraft = "1";
  }
  return query;
}
