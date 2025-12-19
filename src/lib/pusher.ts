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

// Emit WhatsApp event to all connected clients
export const emitWhatsAppEvent = (event: string, data: any) => {
  try {
    const io = getIO();
    if (io) {
      // Log number of connected clients
      const connectedSockets = io.sockets?.sockets?.size || 0;
      console.log(`🔌 Connected clients: ${connectedSockets}`);
      io.emit(event, data);
      console.log(`Socket event emitted: ${event}`);
    } else {
      console.log(`Socket.io not available, skipping event: ${event}`);
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
      io.to(room).emit(event, data);
    }
  } catch (error) {
    console.error("Error emitting to room:", error);
  }
};
