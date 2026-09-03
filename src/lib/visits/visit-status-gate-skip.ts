/** In-memory only — cleared on hard refresh; cleared on logout via clearVisitStatusGateSkip. */
const skippedUserIds = new Set<string>();

export function isVisitStatusGateSkipped(userId: string): boolean {
  if (!userId) return false;
  return skippedUserIds.has(userId);
}

export function setVisitStatusGateSkipped(userId: string): void {
  if (!userId) return;
  skippedUserIds.add(userId);
}

export function clearVisitStatusGateSkip(userId?: string): void {
  if (userId) {
    skippedUserIds.delete(userId);
    return;
  }
  skippedUserIds.clear();
}
