/** LRU-bounded set for socket event / message deduplication. */
export function addToLRUSet(set: Set<string>, value: string, maxSize = 500): void {
  if (set.size >= maxSize) {
    const first = set.values().next().value;
    if (first) set.delete(first);
  }
  set.add(value);
}

export function simpleHashUtf8(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/** Webhook / socket call status → remote leg ended; close local UI + PC. */
export function isRemoteCallTerminalStatus(status: string): boolean {
  const s = status.trim().toLowerCase();
  return (
    s === "busy" ||
    s === "rejected" ||
    s === "declined" ||
    s === "missed" ||
    s === "failed" ||
    s === "terminated" ||
    s === "completed" ||
    s === "ended" ||
    s === "disconnect"
  );
}

export type PendingIncomingCallInvite = {
  callId: string;
  conversationId: string;
  phoneNumberId: string;
  offerSdp: string;
  contactLabel: string;
};
