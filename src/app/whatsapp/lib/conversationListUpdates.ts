import type { Conversation } from "../types";

export function isInternalConversation(conv: Conversation): boolean {
  return Boolean(conv.isInternal || conv.source === "internal");
}

/** Sort comparator used by the inbox list. */
export function compareConversationsForSort(a: Conversation, b: Conversation): number {
  const aIsInternal = isInternalConversation(a);
  const bIsInternal = isInternalConversation(b);
  if (aIsInternal && !bIsInternal) return -1;
  if (!aIsInternal && bIsInternal) return 1;
  return (
    new Date(b.lastMessageTime || 0).getTime() -
    new Date(a.lastMessageTime || 0).getTime()
  );
}

export function sortConversationsList(convs: Conversation[]): Conversation[] {
  return [...convs].sort(compareConversationsForSort);
}

/** Prepend the lazy-loaded "You" row and remove duplicate internal rows. */
export function mergeYouConversationIntoList(
  conversations: Conversation[],
  youConversation: Conversation | null | undefined,
): Conversation[] {
  if (!youConversation?._id) return conversations;
  const youId = String(youConversation._id);
  const filtered = conversations.filter(
    (c) => !isInternalConversation(c) && String(c._id) !== youId,
  );
  return sortConversationsList([youConversation, ...filtered]);
}

/** Index where `conv` belongs in a sorted list (excluding optional skip index). */
export function findConversationInsertIndex(
  list: Conversation[],
  conv: Conversation,
  excludeIndex?: number,
): number {
  for (let i = 0; i < list.length; i++) {
    if (excludeIndex !== undefined && i === excludeIndex) continue;
    if (compareConversationsForSort(conv, list[i]) < 0) return i;
  }
  return list.length;
}

function conversationNeedsReposition(before: Conversation, after: Conversation): boolean {
  if (isInternalConversation(before) !== isInternalConversation(after)) return true;
  const beforeTs = new Date(before.lastMessageTime || 0).getTime();
  const afterTs = new Date(after.lastMessageTime || 0).getTime();
  return beforeTs !== afterTs;
}

/**
 * Patch one conversation and move it only when sort-relevant fields changed.
 * Avoids O(n log n) full-list sort on every socket event.
 */
export function repositionConversationAfterUpdate(
  list: Conversation[],
  conversationId: string,
  updater: (conv: Conversation) => Conversation,
  options?: { reposition?: boolean },
): Conversation[] {
  const idx = list.findIndex((c) => String(c._id) === String(conversationId));
  if (idx === -1) return list;

  const updated = updater(list[idx]);
  if (updated === list[idx]) return list;

  const shouldReposition =
    options?.reposition ??
    conversationNeedsReposition(list[idx], updated);

  if (!shouldReposition) {
    const next = [...list];
    next[idx] = updated;
    return next;
  }

  const without = [...list.slice(0, idx), ...list.slice(idx + 1)];
  const insertAt = findConversationInsertIndex(without, updated);
  const next = [...without];
  next.splice(insertAt, 0, updated);
  return next;
}

/** Insert a new conversation at its sorted position. */
export function insertConversationAtCorrectPosition(
  list: Conversation[],
  conversation: Conversation,
): Conversation[] {
  if (list.some((c) => String(c._id) === String(conversation._id))) return list;
  const insertAt = findConversationInsertIndex(list, conversation);
  const next = [...list];
  next.splice(insertAt, 0, conversation);
  return next;
}

/**
 * Replace or insert a conversation after an update that may change ordering
 * (new message preview / timestamp).
 */
export function upsertConversationWithReposition(
  list: Conversation[],
  conversationId: string,
  build: (existing: Conversation | undefined) => Conversation,
): Conversation[] {
  const idx = list.findIndex((c) => String(c._id) === String(conversationId));
  if (idx === -1) {
    return insertConversationAtCorrectPosition(list, build(undefined));
  }
  return repositionConversationAfterUpdate(list, conversationId, () => build(list[idx]));
}

/** Patch fields on one conversation without changing list order. */
export function patchConversationInList(
  list: Conversation[],
  conversationId: string,
  patch: Partial<Conversation>,
): Conversation[] {
  const idx = list.findIndex((c) => String(c._id) === String(conversationId));
  if (idx === -1) return list;

  const updated = { ...list[idx], ...patch };
  if (updated === list[idx]) return list;

  let changed = false;
  for (const key of Object.keys(patch) as (keyof Conversation)[]) {
    if (list[idx][key] !== updated[key]) {
      changed = true;
      break;
    }
  }
  if (!changed) return list;

  const next = [...list];
  next[idx] = updated;
  return next;
}

/** Map conversations with structural sharing when nothing changed. */
export function mapConversationsInList(
  list: Conversation[],
  mapper: (conv: Conversation) => Conversation,
): Conversation[] {
  let changed = false;
  const next = list.map((conv) => {
    const mapped = mapper(conv);
    if (mapped !== conv) changed = true;
    return mapped;
  });
  return changed ? next : list;
}
