import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Loader2, Search, CheckCheck } from "lucide-react";
import { formatTime } from "../utils";

interface UnifiedSearchResultsProps {
  results: { conversations: any[] } | null;
  loading: boolean;
  query: string;
  onSelectConversation: (conversationId: string) => void;
  onJumpToMessage?: (conversationId: string, messageId: string) => void;
}

export function UnifiedSearchResults({
  results,
  loading,
  query,
  onSelectConversation,
  onJumpToMessage,
}: UnifiedSearchResultsProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#25d366]" />
      </div>
    );
  }
  
  if (!results || results.conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-[#8696a0]" />
        </div>
        <p className="text-[#111b21] dark:text-[#e9edef] font-medium mb-1">
          No results found
        </p>
        <p className="text-sm text-[#667781] dark:text-[#8696a0] text-center">
          Try searching for a phone number
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {results.conversations.map((conv) => (
          <div key={conv.conversationId}>
            {conv.matchedMessages && conv.matchedMessages.length > 0 ? (
              conv.matchedMessages.map((msg: any) => (
                <MessageResultItem
                  key={msg.messageId}
                  conversation={conv}
                  message={msg}
                  query={query}
                  onSelect={() => {
                    if (onJumpToMessage) {
                      onJumpToMessage(conv.conversationId, msg.messageId);
                    }
                  }}
                />
              ))
            ) : (
              <ContactResultItem
                conversation={conv}
                query={query}
                onSelect={() => onSelectConversation(conv.conversationId)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CONTACT/PHONE RESULT ITEM (for conversations matched by name/phone)
// ============================================================================

interface ContactResultItemProps {
  conversation: any;
  query: string;
  onSelect: () => void;
}

function ContactResultItem({ conversation, query, onSelect }: ContactResultItemProps) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer transition-colors border-b border-[#e9edef] dark:border-[#2a3942]"
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={conversation.participantProfilePic} />
        <AvatarFallback className="bg-[#d9fdd3] dark:bg-[#025144] text-[#111b21] dark:text-[#e9edef]">
          {conversation.participantName?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-normal text-[17px] text-[#111b21] dark:text-[#e9edef] truncate">
            {conversation.participantName}
          </h3>
          {conversation.lastMessageTime && (
            <span className="text-xs text-[#667781] dark:text-[#8696a0] flex-shrink-0 ml-2">
              {formatTime(new Date(conversation.lastMessageTime))}
            </span>
          )}
        </div>
        {conversation.lastMessageContent && (
          <p className="text-[14px] text-[#667781] dark:text-[#8696a0] truncate">
            {conversation.lastMessageContent}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE RESULT ITEM (for messages containing search term)
// ============================================================================

interface MessageResultItemProps {
  conversation: any;
  message: any;
  query: string;
  onSelect: () => void;
}

function MessageResultItem({ conversation, message, query, onSelect }: MessageResultItemProps) {
  return (
    <div
      onClick={onSelect}
      className="flex items-start gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer transition-colors border-b border-[#e9edef] dark:border-[#2a3942]"
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={conversation.participantProfilePic} />
        <AvatarFallback className="bg-[#d9fdd3] dark:bg-[#025144] text-[#111b21] dark:text-[#e9edef]">
          {conversation.participantName?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-normal text-[17px] text-[#111b21] dark:text-[#e9edef] truncate">
            {conversation.participantName}
          </h3>
          <span className="text-xs text-[#667781] dark:text-[#8696a0] flex-shrink-0 ml-2">
            {formatTime(new Date(message.timestamp))}
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          {message.direction === 'outgoing' && (
            <CheckCheck className="h-4 w-4 text-[#53bdeb] flex-shrink-0 mt-0.5" />
          )}
          <p className="text-[14px] text-[#667781] dark:text-[#8696a0] line-clamp-2">
            {message.snippet}
          </p>
        </div>
      </div>
    </div>
  );
}
