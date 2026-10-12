import type { Message } from "../types";

export type GroupedItem =
  | {
      type: "message";
      date?: string;
      message: Message;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
    }
  | {
      type: "imageGroup";
      date?: string;
      images: Message[];
    };

function formatDateSeparator(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) return "TODAY";
  if (messageDate.getTime() === yesterday.getTime()) return "YESTERDAY";
  return messageDate
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

function isSameDayLocal(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
}

function messageIdsEqual(a: Message, b: Message): boolean {
  return String(a.messageId || a._id) === String(b.messageId || b._id);
}

function messagesSameOrder(a: Message[], b: Message[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!messageIdsEqual(a[i], b[i])) return false;
  }
  return true;
}

/** Full O(n) grouping pass — used on conversation switch and bulk loads. */
export function buildGroupedMessages(
  filteredMessages: Message[],
  isMounted: boolean,
): GroupedItem[] {
  if (!isMounted) {
    return filteredMessages.map((m) => ({
      type: "message" as const,
      date: undefined,
      message: m,
      isFirstInGroup: true,
      isLastInGroup: true,
    }));
  }

  const result: GroupedItem[] = [];
  let lastDate: string | undefined;
  let currentImageGroup: Message[] = [];
  let imageGroupDirection: "incoming" | "outgoing" | null = null;
  let imageGroupFrom: string | null = null;

  const flushImageGroup = (showDate?: string) => {
    if (currentImageGroup.length >= 2) {
      result.push({ type: "imageGroup", date: showDate, images: [...currentImageGroup] });
    } else if (currentImageGroup.length === 1) {
      result.push({
        type: "message",
        date: showDate,
        message: currentImageGroup[0],
        isFirstInGroup: true,
        isLastInGroup: true,
      });
    }
    currentImageGroup = [];
    imageGroupDirection = null;
    imageGroupFrom = null;
  };

  filteredMessages.forEach((message, idx) => {
    const messageDate = new Date(message.timestamp);
    const prevMessage = idx > 0 ? filteredMessages[idx - 1] : null;
    const nextMessage = idx < filteredMessages.length - 1 ? filteredMessages[idx + 1] : null;

    const showDate =
      !lastDate ||
      !isSameDayLocal(messageDate, new Date(filteredMessages[idx - 1]?.timestamp));
    if (showDate) {
      if (currentImageGroup.length > 0) flushImageGroup();
      lastDate = formatDateSeparator(messageDate);
    }

    const isImage =
      (message.type === "image" || message.type === "sticker") && message.mediaUrl;
    const hasCaption =
      isImage &&
      typeof message.content === "object" &&
      message.content?.caption &&
      message.content.caption.trim();

    const shouldContinueGroup =
      isImage &&
      !hasCaption &&
      currentImageGroup.length > 0 &&
      message.direction === imageGroupDirection &&
      message.from === imageGroupFrom &&
      Math.abs(
        new Date(message.timestamp).getTime() -
          new Date(currentImageGroup[0].timestamp).getTime(),
      ) <
        2 * 60 * 1000;

    if (shouldContinueGroup) {
      currentImageGroup.push(message);
    } else {
      flushImageGroup(showDate ? lastDate : undefined);

      if (isImage && !hasCaption) {
        currentImageGroup = [message];
        imageGroupDirection = message.direction;
        imageGroupFrom = message.from;
      } else if (isImage && hasCaption) {
        const isFirstInGroup =
          !prevMessage ||
          prevMessage.direction !== message.direction ||
          prevMessage.from !== message.from ||
          Math.abs(
            new Date(message.timestamp).getTime() -
              new Date(prevMessage.timestamp).getTime(),
          ) > 60000 ||
          showDate;

        const isLastInGroup =
          !nextMessage ||
          nextMessage.direction !== message.direction ||
          nextMessage.from !== message.from ||
          Math.abs(
            new Date(nextMessage.timestamp).getTime() -
              new Date(message.timestamp).getTime(),
          ) > 60000 ||
            (nextMessage && !isSameDayLocal(new Date(nextMessage.timestamp), messageDate));

        result.push({
          type: "message",
          date: showDate ? lastDate : undefined,
          message,
          isFirstInGroup,
          isLastInGroup,
        });
      } else {
        const isFirstInGroup =
          !prevMessage ||
          prevMessage.direction !== message.direction ||
          prevMessage.from !== message.from ||
          Math.abs(
            new Date(message.timestamp).getTime() -
              new Date(prevMessage.timestamp).getTime(),
          ) > 60000 ||
          showDate;

        const isLastInGroup =
          !nextMessage ||
          nextMessage.direction !== message.direction ||
          nextMessage.from !== message.from ||
          Math.abs(
            new Date(nextMessage.timestamp).getTime() -
              new Date(message.timestamp).getTime(),
          ) > 60000 ||
            (nextMessage && !isSameDayLocal(new Date(nextMessage.timestamp), messageDate));

        result.push({
          type: "message",
          date: showDate ? lastDate : undefined,
          message,
          isFirstInGroup,
          isLastInGroup,
        });
      }
    }
  });

  flushImageGroup();
  return result;
}

/** Update message objects inside grouped items when order/structure is unchanged. */
export function patchGroupedMessagesInPlace(
  grouped: GroupedItem[],
  messages: Message[],
): GroupedItem[] {
  const byId = new Map(messages.map((m) => [String(m.messageId || m._id), m]));
  let changed = false;

  const next = grouped.map((item) => {
    if (item.type === "message") {
      const id = String(item.message.messageId || item.message._id);
      const updated = byId.get(id);
      if (updated && updated !== item.message) {
        changed = true;
        return { ...item, message: updated };
      }
      return item;
    }

    const updatedImages = item.images.map((img) => {
      const id = String(img.messageId || img._id);
      return byId.get(id) ?? img;
    });
    if (updatedImages.some((img, i) => img !== item.images[i])) {
      changed = true;
      return { ...item, images: updatedImages };
    }
    return item;
  });

  return changed ? next : grouped;
}

/**
 * Incremental grouping: reuse previous structure when possible.
 * - Same message ids/order → patch message fields in place (status, reactions)
 * - Otherwise → full rebuild
 */
export function deriveGroupedMessages(
  filteredMessages: Message[],
  isMounted: boolean,
  previousMessages: Message[],
  previousGrouped: GroupedItem[],
): GroupedItem[] {
  if (
    previousGrouped.length > 0 &&
    messagesSameOrder(filteredMessages, previousMessages)
  ) {
    return patchGroupedMessagesInPlace(previousGrouped, filteredMessages);
  }

  return buildGroupedMessages(filteredMessages, isMounted);
}
