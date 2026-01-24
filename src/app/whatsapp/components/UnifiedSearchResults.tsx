/**
 * Unified Search Results Component - WhatsApp-Style Design
 * Shows each conversation exactly once with aggregated match information
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Phone,
  User,
  Loader2,
  Search,
  PhoneCall,
  Check,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "../utils";
import type { UnifiedConversationResult, UnifiedSearchResults } from "@/lib/whatsapp/unifiedSearchUtils";
import * as React from "react";

interface UnifiedSearchResultsProps {
  results: UnifiedSearchResults | null;
  loading: boolean;
  query: string;
  onSelectConversation: (conversationId: string) => void;
  onStartNewChat?: (phone: string) => void;
  onJumpToMessage?: (conversationId: string, messageId: string) => void;
  selectedResultIndex?: number;
  onResultClick?: (index: number) => void;
}

export function UnifiedSearchResults({
  results,
  loading,
  query,
  onSelectConversation,
  onStartNewChat,
  onJumpToMessage,
}: UnifiedSearchResultsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#25d366]" />
      </div>
    );
  }
  
  // No results
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
          Try searching for a name, phone number, or message content
        </p>
        
        {/* Start new chat option */}
        {results?.hasStartNewChat && results.startNewChatPhone && onStartNewChat && (
          <Button
            onClick={() => onStartNewChat(results.startNewChatPhone!)}
            className="mt-4 bg-[#25d366] hover:bg-[#20bd5c] text-white"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Start chat with {results.startNewChatPhone}
          </Button>
        )}
      </div>
    );
  }
  
  // Results
  const { conversations } = results;
  
  // Group results by type: conversations with phone/name matches and message-only matches
  const phoneNameMatches: UnifiedConversationResult[] = [];
  const messageOnlyMatches: UnifiedConversationResult[] = [];
  
  conversations.forEach(conv => {
    if (conv.matches.matchedInPhone || conv.matches.matchedInName) {
      phoneNameMatches.push(conv);
    } else if (conv.matches.totalMessageMatches > 0) {
      messageOnlyMatches.push(conv);
    }
  });
  
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Start new chat option (if applicable) */}
      {results.hasStartNewChat && results.startNewChatPhone && onStartNewChat && (
        <div className="p-3 border-b border-[#e9edef] dark:border-[#2a3942]">
          <Button
            onClick={() => onStartNewChat(results.startNewChatPhone!)}
            className="w-full bg-[#25d366] hover:bg-[#20bd5c] text-white h-auto py-3"
            variant="default"
          >
            <PhoneCall className="h-4 w-4 mr-2" />
            Start new chat with {results.startNewChatPhone}
          </Button>
        </div>
      )}
      
      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto">
        {/* Contact/Phone matches section */}
        {phoneNameMatches.length > 0 && (
          <div>
            {phoneNameMatches.map((conv) => (
              <ContactResultItem
                key={conv.conversationId}
                conversation={conv}
                query={query}
                onSelect={() => onSelectConversation(conv.conversationId)}
              />
            ))}
          </div>
        )}
        
        {/* Messages section */}
        {messageOnlyMatches.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#1f2c34] sticky top-0 z-10">
              <h3 className="text-sm font-medium text-[#667781] dark:text-[#8696a0]">
                Messages
              </h3>
            </div>
            {messageOnlyMatches.map((conv) => (
              <div key={conv.conversationId}>
                {conv.matches.matchedMessages.map((msg, idx) => (
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
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// CONTACT/PHONE RESULT ITEM (for conversations matched by name/phone)
// ============================================================================

interface ContactResultItemProps {
  conversation: UnifiedConversationResult;
  query: string;
  onSelect: () => void;
}

function ContactResultItem({ conversation, query, onSelect }: ContactResultItemProps) {
  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer transition-colors border-b border-[#e9edef] dark:border-[#2a3942]"
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={conversation.participantProfilePic} />
        <AvatarFallback className="bg-[#d9fdd3] dark:bg-[#025144] text-[#111b21] dark:text-[#e9edef]">
          {conversation.participantName?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <div className="flex items-center justify-between mb-0.5">
          <h3
            className="font-normal text-[17px] text-[#111b21] dark:text-[#e9edef] truncate"
            dangerouslySetInnerHTML={{
              __html: conversation.matches.matchedInName && conversation.matches.nameMatchedText
                ? conversation.matches.nameMatchedText
                : conversation.participantName,
            }}
          />
          {conversation.lastMessageTime && (
            <span className="text-xs text-[#667781] dark:text-[#8696a0] flex-shrink-0 ml-2">
              {formatTime(new Date(conversation.lastMessageTime))}
            </span>
          )}
        </div>
        
        {/* Last message preview */}
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
  conversation: UnifiedConversationResult;
  message: {
    messageId: string;
    snippet: string;
    timestamp: Date;
    direction: 'incoming' | 'outgoing';
    mediaUrl?: string;
  };
  query: string;
  onSelect: () => void;
}

function MessageResultItem({ conversation, message, query, onSelect }: MessageResultItemProps) {
  // Remove HTML tags from snippet for display
  const cleanSnippet = message.snippet.replace(/<mark[^>]*>/g, '').replace(/<\/mark>/g, '');
  
  // Extract highlighted parts for rendering
  const renderSnippet = () => {
    const parts = message.snippet.split(/(<mark[^>]*>.*?<\/mark>)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('<mark')) {
        const text = part.replace(/<mark[^>]*>|<\/mark>/g, '');
        return (
          <span key={idx} className="text-[#00a884] dark:text-[#00a884] font-medium">
            {text}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };
  
  return (
    <div
      onClick={onSelect}
      className="flex items-start gap-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] cursor-pointer transition-colors border-b border-[#e9edef] dark:border-[#2a3942]"
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={conversation.participantProfilePic} />
        <AvatarFallback className="bg-[#d9fdd3] dark:bg-[#025144] text-[#111b21] dark:text-[#e9edef]">
          {conversation.participantName?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name and date */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-normal text-[17px] text-[#111b21] dark:text-[#e9edef] truncate">
            {conversation.participantName}
          </h3>
          <span className="text-xs text-[#667781] dark:text-[#8696a0] flex-shrink-0 ml-2">
            {formatTime(new Date(message.timestamp))}
          </span>
        </div>
        
        {/* Message snippet with highlighted search term */}
        <div className="flex items-start gap-1.5">
          {message.direction === 'outgoing' && (
            <CheckCheck className="h-4 w-4 text-[#53bdeb] flex-shrink-0 mt-0.5" />
          )}
          <p className="text-[14px] text-[#667781] dark:text-[#8696a0] line-clamp-2">
            {renderSnippet()}
          </p>
        </div>
      </div>
    </div>
  );
}
