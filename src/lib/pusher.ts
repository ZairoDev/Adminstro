// WhatsApp Socket Events
// These constants are used for socket.io event names

// Event names for WhatsApp messaging
export const WHATSAPP_EVENTS = {
  // Room events
  JOIN_WHATSAPP_ROOM: "join-whatsapp-room",
  LEAVE_WHATSAPP_ROOM: "leave-whatsapp-room",
  
  // Message events
  NEW_MESSAGE: "whatsapp-new-message",
  MESSAGE_STATUS_UPDATE: "whatsapp-message-status",
  MESSAGE_ECHO: "whatsapp-message-echo", // For message echoes (smb_message_echoes)
  
  // Conversation events
  NEW_CONVERSATION: "whatsapp-new-conversation",
  CONVERSATION_UPDATE: "whatsapp-conversation-update",
     
  // Typing indicator
  TYPING_START: "whatsapp-typing-start",
  TYPING_STOP: "whatsapp-typing-stop",

  // Call events (calls webhook field)
  INCOMING_CALL: "whatsapp-incoming-call",
  CALL_STATUS_UPDATE: "whatsapp-call-status",
  CALL_MISSED: "whatsapp-call-missed",
  CALL_SDP_ANSWER: "whatsapp-call-sdp-answer",
  /** Customer-initiated call: Call Connect webhook carries Meta SDP offer. */
  CALL_INCOMING_OFFER: "whatsapp-call-incoming-offer",

  // History events (history webhook field)
  HISTORY_SYNC: "whatsapp-history-sync",

  // SMB app state sync (smb_app_state_sync webhook field)
  APP_STATE_SYNC: "whatsapp-app-state-sync",
} as const;

// Helper to get the global socket.io instance (server-side)
export const getIO = () => {
  if (typeof window !== "undefined") {
    console.warn("getIO called on client side");
    return null;
  }
  return (global as any).io || null;
};

/** Socket payload — extensible; `userId` triggers per-user room emit. */
export type WhatsAppEmitPayload = Record<string, unknown> & {
  userId?: string;
  businessPhoneId?: string;
  /** Stable channel identifier for dual-room routing after number migrations. */
  whatsappChannelId?: string;
  isRetarget?: boolean;
  retargetStage?: string | null;
};

/** Emit only to the personal room for this user (joined via join-whatsapp-room). */
export const emitWhatsAppEventToUser = (
  userId: string,
  event: string,
  data: WhatsAppEmitPayload
) => {
  emitToRoom(`user-${userId}`, event, data);
};

// Emit WhatsApp event: targeted user room when userId is set, otherwise broadcast + phone rooms
export const emitWhatsAppEvent = (event: string, data: WhatsAppEmitPayload) => {
  try {
    const io = getIO();
    if (!io) {
      console.log(`Socket.io not available, skipping event: ${event}`);
      return;
    }

    const targetUserId =
      data?.userId != null && String(data.userId).length > 0
        ? String(data.userId)
        : null;

    if (targetUserId) {
      emitWhatsAppEventToUser(targetUserId, event, data);
      return;
    }

    const connectedSockets = io.sockets?.sockets?.size || 0;
    console.log(`🔌 Connected clients: ${connectedSockets}`);
    try {
      const messagePayload =
        data?.message != null && typeof data.message === "object"
          ? (data.message as {
              businessPhoneId?: string;
              from?: string;
              retargetStage?: string | null;
              isRetarget?: boolean;
            })
          : undefined;
      const businessPhoneId =
        data?.businessPhoneId ||
        messagePayload?.businessPhoneId ||
        messagePayload?.from;
      const retargetStage =
        data?.retargetStage || messagePayload?.retargetStage || null;
      const isRetarget = !!(data?.isRetarget || messagePayload?.isRetarget);
      const allowPhoneRoomEmit = !(
        isRetarget && retargetStage && retargetStage !== "handed_to_sales"
      );

      // Emit to phone/retarget room OR global — never both (clients in a phone room would get duplicates).
      if (businessPhoneId) {
        if (allowPhoneRoomEmit) {
          const room = `whatsapp-phone-${businessPhoneId}`;
          io.to(room).emit(event, data);
          console.log(`Socket event emitted to room ${room}: ${event}`);

          // Dual-room: also emit to the stable channel room so clients joined after
          // a number migration still receive events. Clients that have joined both rooms
          // are deduped by the eventId field on the payload.
          const channelId =
            data?.whatsappChannelId ||
            (data?.message != null && typeof data.message === "object"
              ? (data.message as { whatsappChannelId?: string }).whatsappChannelId
              : undefined);
          if (channelId && String(channelId) !== businessPhoneId) {
            const channelRoom = `whatsapp-channel-${channelId}`;
            io.to(channelRoom).emit(event, data);
            console.log(`Socket event emitted to channel room ${channelRoom}: ${event}`);
          }
        } else {
          const retargetRoom = `whatsapp-retarget-${businessPhoneId}`;
          io.to(retargetRoom).emit(event, data);
          console.log(
            `Socket event emitted to retarget room ${retargetRoom}: ${event}`
          );
        }
      } else {
        io.emit(event, data);
        console.log(`Socket event emitted: ${event}`);
      }
    } catch (emitErr) {
      console.error(`Error during socket emit for event ${event}:`, emitErr);
    }
  } catch (error) {
    console.error("Error emitting socket event:", error);
  }
};

// Emit to specific room
export const emitToRoom = (room: string, event: string, data: any) => {
  try {
    const io = getIO();
    if (io) {
      try {
        // console.log(`🔁 Emitting event ${event} to room ${room} with payload:`, data);
        io.to(room).emit(event, data);
      } catch (emitErr) {
        console.error(`Error during io.to(${room}).emit for event ${event}:`, emitErr);
      }
    }
  } catch (error) {
    console.error("Error emitting to room:", error);
  }
};
