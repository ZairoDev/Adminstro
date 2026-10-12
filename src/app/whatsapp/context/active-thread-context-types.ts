import type { MutableRefObject, SetStateAction } from "react";
import type { ChannelPhoneConfig } from "@/lib/whatsapp/resolveAllowedPhoneConfigs";
import type { ConversationReader } from "@/lib/whatsapp/conversationReaders";
import type { Conversation, Message, Template } from "../types";

export interface ActiveThreadStateValue {
  selectedConversation: Conversation | null;
  messages: Message[];
  messagesLoading: boolean;
  hasMoreMessages: boolean;
  loadingOlderMessages: boolean;
  templates: Template[];
  templatesLoading: boolean;
  templatesChannelScoped: boolean;
  readersRefreshToken: number;
  conversationReaders: ConversationReader[];
  skipReadersFetch: boolean;
  setConversationReaders: (readers: ConversationReader[]) => void;
  allowedPhoneConfigs: ChannelPhoneConfig[];
  phoneConfigsReady: boolean;
  newMessage: string;
  setNewMessage: (value: string) => void;
  replyToMessage: Message | null;
  setReplyToMessage: (message: Message | null) => void;
  sendingMessage: boolean;
  setSendingMessage: (value: boolean) => void;
  uploadingMedia: boolean;
  setUploadingMedia: (value: boolean) => void;
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;
  templateParams: Record<string, string>;
  setTemplateParams: (params: Record<string, string>) => void;
  showMessageSearch: boolean;
  setShowMessageSearch: (value: boolean | ((prev: boolean) => boolean)) => void;
  messageSearchQuery: string;
  setMessageSearchQuery: (value: string) => void;
  pendingScrollToMessageId: string | null;
  setPendingScrollToMessageId: (value: string | null) => void;
}

export interface ActiveThreadActionsValue {
  selectConversation: (conversation: Conversation | null) => void;
  loadOlderMessages: () => void;
  mutateActiveMessages: (mutator: (messages: Message[]) => Message[]) => void;
  markConversationAsRead: (
    conversationId: string,
    opts?: { lastMessageId?: string },
  ) => Promise<void>;
  handleUpdateConversation: (conversationId: string, patch: Partial<Conversation>) => void;
  handleCrmLabelsUpdated: (labels: string[]) => void;
  selectedConversationRef: MutableRefObject<Conversation | null>;
  markConversationAsReadRef: MutableRefObject<
    (conversationId: string, opts?: { lastMessageId?: string }) => Promise<void>
  >;
  bumpReadersRefreshToken: () => void;
  setSelectedConversation: (value: SetStateAction<Conversation | null>) => void;
  templatesCacheKey: string;
  setPendingScrollToMessageId: (id: string | null) => void;
  setMessageSearchQuery: (query: string) => void;
}
