import { memo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MessageSquare,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "../utils";

interface SearchResultsProps {
  results: {
    phoneNumbers: any[];
    conversations: any[];
    messages: any[];
  };
  totalResults: {
    phoneNumbers: number;
    conversations: number;
    messages: number;
    total: number;
  };
  query: string;
  loading: boolean;
  onSelectConversation: (conversation: any) => void;
  onStartNewChat: (phone: string) => void;
  onJumpToMessage: (conversationId: string, messageId: string) => void;
  searchTime?: number;
}

export const SearchResults = memo(function SearchResults({
  results,
  totalResults,
  query,
  loading,
  onSelectConversation,
  onStartNewChat,
  onJumpToMessage,
  searchTime,
}: SearchResultsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["phoneNumbers", "conversations", "messages"])
  );
  const [expandedMessageGroups, setExpandedMessageGroups] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleMessageGroup = (conversationId: string) => {
    setExpandedMessageGroups((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25d366] mb-4" />
        <p className="text-sm text-[#667781] dark:text-[#8696a0]">Searching...</p>
      </div>
    );
  }

  if (totalResults.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-[#8696a0]" />
        </div>
        <p className="text-[#111b21] dark:text-[#e9edef] font-medium mb-1">
          No results found
        </p>
        <p className="text-sm text-[#667781] dark:text-[#8696a0]">
          Try searching with different keywords
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21]">
      {/* Search Results Header */}
      <div className="px-4 py-3 border-b border-[#e9edef] dark:border-[#222d34] bg-[#f0f2f5] dark:bg-[#202c33]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
            {totalResults.total} result{totalResults.total !== 1 ? "s" : ""} for &quot;{query}&quot;
          </p>
          {searchTime && searchTime < 1000 && (
            <span className="text-xs text-[#667781] dark:text-[#8696a0]">
              {searchTime}ms
            </span>
          )}
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {/* Phone Numbers Section */}
        {totalResults.phoneNumbers > 0 && (
          <div className="border-b border-[#e9edef] dark:border-[#222d34]">
            <button
              onClick={() => toggleSection("phoneNumbers")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#008069] dark:text-[#00a884]" />
                <span className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
                  Phone Numbers
                </span>
                <Badge variant="secondary" className="text-xs">
                  {totalResults.phoneNumbers}
                </Badge>
              </div>
              {expandedSections.has("phoneNumbers") ? (
                <ChevronUp className="h-4 w-4 text-[#667781]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#667781]" />
              )}
            </button>

            {expandedSections.has("phoneNumbers") && (
              <div>
                {results.phoneNumbers.map((result, idx) => (
                  <PhoneNumberResult
                    key={idx}
                    result={result}
                    onSelectConversation={onSelectConversation}
                    onStartNewChat={onStartNewChat}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversations Section */}
        {totalResults.conversations > 0 && (
          <div className="border-b border-[#e9edef] dark:border-[#222d34]">
            <button
              onClick={() => toggleSection("conversations")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#008069] dark:text-[#00a884]" />
                <span className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
                  Conversations
                </span>
                <Badge variant="secondary" className="text-xs">
                  {totalResults.conversations}
                </Badge>
              </div>
              {expandedSections.has("conversations") ? (
                <ChevronUp className="h-4 w-4 text-[#667781]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#667781]" />
              )}
            </button>

            {expandedSections.has("conversations") && (
              <div>
                {results.conversations.map((conv) => (
                  <ConversationResult
                    key={conv._id}
                    conversation={conv}
                    onSelect={onSelectConversation}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Section */}
        {totalResults.messages > 0 && (
          <div className="border-b border-[#e9edef] dark:border-[#222d34]">
            <button
              onClick={() => toggleSection("messages")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-[#008069] dark:text-[#00a884]" />
                <span className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
                  Messages
                </span>
                <Badge variant="secondary" className="text-xs">
                  {totalResults.messages}
                </Badge>
              </div>
              {expandedSections.has("messages") ? (
                <ChevronUp className="h-4 w-4 text-[#667781]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#667781]" />
              )}
            </button>

            {expandedSections.has("messages") && (
              <div>
                {results.messages.map((group) => (
                  <MessageGroupResult
                    key={group.conversationId}
                    group={group}
                    expanded={expandedMessageGroups.has(group.conversationId)}
                    onToggle={() => toggleMessageGroup(group.conversationId)}
                    onJumpToMessage={onJumpToMessage}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Phone Number Result Item
const PhoneNumberResult = memo(function PhoneNumberResult({
  result,
  onSelectConversation,
  onStartNewChat,
}: any) {
  const handleClick = () => {
    if (result.conversationExists) {
      onSelectConversation({ _id: result.conversationId, participantPhone: result.phone });
    } else {
      onStartNewChat(result.phone);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-[#25d366]"
    >
      <div className="w-12 h-12 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
        {result.conversationExists ? (
          <Phone className="h-6 w-6 text-white" />
        ) : (
          <Plus className="h-6 w-6 text-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
          {result.phone}
        </p>
        {result.name && (
          <p className="text-xs text-[#667781] dark:text-[#8696a0]">{result.name}</p>
        )}
        <p className="text-xs text-[#667781] dark:text-[#8696a0] mt-0.5">
          {result.conversationExists ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#25d366]" />
              Open conversation
            </span>
          ) : (
            "Start new chat"
          )}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-[#8696a0] flex-shrink-0" />
    </div>
  );
});

// Conversation Result Item
const ConversationResult = memo(function ConversationResult({
  conversation,
  onSelect,
}: any) {
  return (
    <div
      onClick={() => onSelect(conversation)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer transition-colors border-l-4 border-l-transparent hover:border-l-[#25d366]"
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={conversation.participantProfilePic} />
        <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6b7b85] text-[#54656f] dark:text-white text-sm font-medium">
          {conversation.participantName?.slice(0, 2).toUpperCase() || "??"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef] truncate">
            {conversation.participantName || conversation.participantPhone}
          </p>
          {conversation.lastMessageTime && (
            <span className="text-xs text-[#667781] dark:text-[#8696a0] flex-shrink-0 ml-2">
              {formatTime(conversation.lastMessageTime)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-[#667781] dark:text-[#8696a0] truncate">
            {conversation.lastMessageContent || "No messages yet"}
          </p>
          {conversation.unreadCount > 0 && (
            <Badge className="bg-[#25d366] text-white text-xs ml-2 flex-shrink-0">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>

        <p className="text-xs text-[#008069] dark:text-[#00a884] mt-1">
          Matched in: {conversation.matchedIn}
        </p>
      </div>
    </div>
  );
});

// Message Group Result
const MessageGroupResult = memo(function MessageGroupResult({
  group,
  expanded,
  onToggle,
  onJumpToMessage,
}: any) {
  return (
    <div className="border-b border-[#e9edef] dark:border-[#222d34] last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors text-left"
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={group.participantProfilePic} />
          <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6b7b85] text-[#54656f] dark:text-white text-xs font-medium">
            {group.participantName?.slice(0, 2).toUpperCase() || "??"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef]">
              {group.participantName || group.participantPhone}
            </p>
            <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">
              {group.totalMatches} match{group.totalMatches !== 1 ? "es" : ""}
            </Badge>
          </div>

          <p className="text-xs text-[#667781] dark:text-[#8696a0]">
            {group.participantPhone}
          </p>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-[#667781] flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[#667781] flex-shrink-0 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="bg-[#f5f6f6] dark:bg-[#0b141a]">
          {group.messages.map((msg: any) => (
            <button
              key={msg.messageId}
              onClick={() => onJumpToMessage(group.conversationId, msg.messageId)}
              className="w-full px-4 py-3 text-left hover:bg-[#e9edef] dark:hover:bg-[#182229] transition-colors border-l-4 border-l-transparent hover:border-l-[#25d366]"
            >
              <div className="flex items-start justify-between mb-1">
                <Badge
                  variant={msg.direction === "incoming" ? "secondary" : "default"}
                  className="text-xs"
                >
                  {msg.direction === "incoming" ? "Received" : "Sent"}
                </Badge>
                <span className="text-xs text-[#667781] dark:text-[#8696a0]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>

              <div
                className="text-xs text-[#111b21] dark:text-[#e9edef] leading-relaxed [&_mark]:bg-yellow-200 dark:[&_mark]:bg-yellow-600 [&_mark]:px-0.5 [&_mark]:rounded"
                dangerouslySetInnerHTML={{ __html: msg.snippet }}
              />

              {msg.mediaUrl && (
                <div className="mt-2 flex items-center gap-1 text-xs text-[#008069] dark:text-[#00a884]">
                  <MessageSquare className="h-3 w-3" />
                  <span>Has media</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

