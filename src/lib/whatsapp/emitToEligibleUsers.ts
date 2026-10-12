import { emitWhatsAppEvent } from "@/lib/pusher";
import { getEligibleUsersForNotification } from "./notificationRecipients";
import { buildWhatsAppRoomPayload } from "./socketPayload";

type EmitPayload = Record<string, unknown> & {
  businessPhoneId?: string;
  whatsappChannelId?: string;
  isRetarget?: boolean;
  retargetStage?: string | null;
};

/**
 * Emit a WhatsApp socket event to every user who can see this conversation.
 * Uses per-user rooms (user-{userId}), not global broadcast.
 */
export async function emitWhatsAppEventToEligibleUsers(
  event: string,
  conversation: Record<string, unknown>,
  basePayload: EmitPayload,
  opts: { excludeUserId?: string } = {}
): Promise<number> {
  const eligible = await getEligibleUsersForNotification(conversation);
  const roomPayload = buildWhatsAppRoomPayload(conversation, basePayload);

  // Broadcast to phone/channel rooms for clients not on personal user rooms.
  emitWhatsAppEvent(event, roomPayload);

  let count = 0;
  for (const user of eligible) {
    if (
      opts.excludeUserId &&
      String(user.userId) === String(opts.excludeUserId)
    ) {
      continue;
    }
    emitWhatsAppEvent(event, {
      ...roomPayload,
      userId: user.userId,
    });
    count += 1;
  }

  return count;
}
