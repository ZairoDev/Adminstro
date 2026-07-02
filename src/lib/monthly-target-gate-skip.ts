/** In-memory only — cleared on hard refresh; cleared on logout via clearMonthlyTargetGateSkip. */
const skippedUserIds = new Set<string>();

export function isMonthlyTargetGateSkipped(userId: string): boolean {
  if (!userId) return false;
  return skippedUserIds.has(userId);
}

export function setMonthlyTargetGateSkipped(userId: string): void {
  if (!userId) return;
  skippedUserIds.add(userId);
}

export function clearMonthlyTargetGateSkip(userId?: string): void {
  if (userId) {
    skippedUserIds.delete(userId);
    return;
  }
  skippedUserIds.clear();
}

export interface MonthlyTargetGateFooterActions {
  hasUnsaved: boolean;
  isSavingAll: boolean;
  saveAll: () => Promise<void>;
}
