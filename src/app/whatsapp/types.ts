export interface MessageContent {
  text?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactivePayload?: any;
}

export interface Message {
  _id?: string;
  messageId: string;
  from: string;
  to: string;
  type: string;
  content: MessageContent | string;
  displayText?: string;
  mediaUrl?: string;
  timestamp: Date;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
  direction: "incoming" | "outgoing";
  isEcho?: boolean;
}

export interface Conversation {
  _id: string;
  participantPhone: string;
  participantName: string;
  participantProfilePic?: string;
  lastMessageId?: string;
  lastMessageContent?: string;
  lastMessageTime?: Date;
  lastMessageDirection?: string;
  lastMessageStatus?: "sending" | "sent" | "delivered" | "read" | "failed";
  unreadCount: number;
  status: string;
  lastCustomerMessageAt?: Date;
  sessionExpiresAt?: Date;
}

export interface Template {
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

