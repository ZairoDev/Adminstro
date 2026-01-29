import { Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";
import { getMessageDisplayText } from "../utils";
import {
  FileText,
  Forward,
  Download,
  X,
  Check,
  MoreVertical,
  Copy,
  Reply,
  Smile,
  ChevronLeft,
  ChevronRight,
  Film,
  Music,
  ChevronDown,
  Play,
  ArrowDown,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef, useCallback, memo, TouchEvent, forwardRef, useImperativeHandle } from "react";
import { AlertTriangle, CheckCheck, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ReadMoreText component for messages longer than 30 words
const ReadMoreText = memo(function ReadMoreText({
  text,
  maxWords = 30,
  searchQuery,
}: {
  text: string;
  maxWords?: number;
  searchQuery?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Count words in text
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const shouldTruncate = wordCount > maxWords;
  
  // Get truncated text (first maxWords words)
  const getTruncatedText = () => {
    if (!shouldTruncate) return text;
    const words = text.trim().split(/\s+/);
    return words.slice(0, maxWords).join(" ") + "...";
  };
  
  const displayText = isExpanded || !shouldTruncate ? text : getTruncatedText();
  
  // Highlight search query in text
  const highlightText = (text: string) => {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchQuery.toLowerCase()) {
        return (
          <mark
            key={index}
            className="bg-[#fff3cd] dark:bg-[#4a4000] text-[#111b21] dark:text-[#e9edef] px-0.5 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };
  
  return (
    <div>
      <p className="text-[14.2px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words">
        {highlightText(displayText)}
      </p>
      {shouldTruncate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="text-[12px] text-[#008069] dark:text-[#00a884] hover:underline mt-1 font-medium"
        >
          {isExpanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
});

interface MessageListProps {
  messages: Message[];
  messagesLoading: boolean;
  messageSearchQuery: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  selectedConversationActive: boolean;
  onLoadOlderMessages?: () => void;
  hasMoreMessages?: boolean;
  loadingOlderMessages?: boolean;
  onForwardMessages?: (messageIds: string[]) => void;
  conversations?: any[];
  onReplyMessage?: (message: Message) => void;
  onReactMessage?: (message: Message, emoji: string) => void;
  isMobile?: boolean;
  pendingScrollToMessageId?: string | null;
  onScrolledToMessage?: () => void;
}

// Status icon component with error tooltip support
const StatusIcon = memo(function StatusIcon({ 
  status, 
  failureReason,
  errorCode 
}: { 
  status: Message["status"];
  failureReason?: { code?: string; message?: string };
  errorCode?: number | string | null;
}) {
  const errorCodeToUse = errorCode || failureReason?.code;
  
  // Import error handler dynamically to avoid circular dependencies
  const getErrorTooltip = () => {
    if (status !== "failed" || !errorCodeToUse) return null;
    
    try {
      const { getWhatsAppErrorInfo, getActionMessage } = require("@/lib/whatsapp/errorHandler");
      const errorInfo = getWhatsAppErrorInfo(errorCodeToUse);
      const actionMessage = getActionMessage(errorInfo);
      return `${errorInfo.userMessage} ${actionMessage}\n\nError Code: ${errorCodeToUse}\nSeverity: ${errorInfo.severity.toUpperCase()}\n\n${errorInfo.description}`;
    } catch (e) {
      return failureReason?.message || `Message failed to send. Error code: ${errorCodeToUse}`;
    }
  };

  const tooltipText = getErrorTooltip();

  const icon = (() => {
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 text-[#8696a0]" />;
      case "sent":
        return <Check className="h-3 w-3 text-[#8696a0]" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-[#8696a0]" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-[#53bdeb]" />;
      case "failed":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  })();

  if (!icon) return null;

  // Wrap failed status with tooltip
  if (status === "failed" && tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{icon}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="whitespace-pre-line text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return icon;
});

// Format date for separator
function formatDateSeparator(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) return "TODAY";
  if (messageDate.getTime() === yesterday.getTime()) return "YESTERDAY";
  return messageDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
}

// Common reactions
const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Image Group Component
const ImageGroup = memo(function ImageGroup({
  images,
  isOutgoing,
  onImageClick,
  onForward,
  selectMode,
  selectedIds,
  onSelect,
  isMounted,
}: {
  images: Message[];
  isOutgoing: boolean;
  onImageClick: (url: string, index: number) => void;
  onForward?: (ids: string[]) => void;
  selectMode: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  isMounted: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const displayImages = images.slice(0, 4);
  const remainingCount = images.length > 4 ? images.length - 4 : 0;

  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    return "grid-cols-2";
  };

  return (
    <div
      className={cn(
        "flex gap-2 py-1 group",
        // Responsive padding - smaller on mobile
        "px-3 md:px-[63px]",
        isOutgoing ? "justify-end" : "justify-start"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Checkbox for select mode */}
      {selectMode && (
        <div className="flex items-center">
          <Checkbox
            checked={images.every((m) => selectedIds.has(m._id || m.messageId))}
            onCheckedChange={() => images.forEach((m) => onSelect(m._id || m.messageId))}
          />
        </div>
      )}

      {/* Forward button - left side for outgoing, hidden for incoming in this position */}
      {!selectMode && isHovered && onForward && isOutgoing && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full self-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onForward(images.map((m) => m._id || m.messageId))}
              >
                <Forward className="h-4 w-4 text-[#8696a0]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Forward</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Image Grid */}
      <div
        className={cn(
          "relative rounded-lg overflow-hidden shadow-sm",
          // Responsive max-width for image grid
          "max-w-[280px] md:max-w-[320px]",
          isOutgoing ? "bg-[#d9fdd3] dark:bg-[#005c4b]" : "bg-white dark:bg-[#202c33]"
        )}
      >
        <div className={cn("grid gap-0.5 p-0.5", getGridClass(displayImages.length))}>
          {displayImages.map((img, idx) => (
            <div
              key={img._id || img.messageId}
              className={cn(
                "relative cursor-pointer overflow-hidden",
                displayImages.length === 1 ? "w-full" : "aspect-square",
                displayImages.length === 3 && idx === 2 && "col-span-2"
              )}
              onClick={() => onImageClick(img.mediaUrl!, idx)}
            >
              <img
                src={img.mediaUrl}
                alt="Image"
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                loading="lazy"
              />
              {/* Individual status icon for each image */}
              {isOutgoing && (
                <div className="absolute bottom-1 right-1">
                  <StatusIcon 
                    status={img.status} 
                    failureReason={img.failureReason}
                    errorCode={img.failureReason?.code}
                  />
                </div>
              )}
              {/* Remaining count overlay on last image */}
              {remainingCount > 0 && idx === 3 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-2xl font-semibold">+{remainingCount}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Timestamp - only show if no individual status icons */}
        {!isOutgoing && (
          <div className="absolute bottom-1 right-2">
            <span className="text-[11px] text-white/90 drop-shadow-md">
              {isMounted
                ? new Date(images[0].timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--:--"}
            </span>
          </div>
        )}

        {/* Hover menu */}
        {!selectMode && (
          <div
            className={cn(
              "absolute z-20",
              // Nudge the trigger slightly outside the bubble so the menu
              // doesn't overlap the content and accidentally click items.
              isOutgoing ? "-top-2 -left-3" : "-top-2 -right-3"
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-black/30 hover:bg-black/50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
                >
                  <ChevronDown className="h-4 w-4 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isOutgoing ? "start" : "end"}>
                {onForward && (
                  <DropdownMenuItem onClick={() => onForward(images.map((m) => m._id || m.messageId))}>
                    <Forward className="h-4 w-4 mr-2" />
                    Forward all
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Forward button - right side for incoming */}
      {!selectMode && isHovered && onForward && !isOutgoing && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full self-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onForward(images.map((m) => m._id || m.messageId))}
              >
                <Forward className="h-4 w-4 text-[#8696a0]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Forward</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

// Single message bubble component
const MessageBubble = memo(function MessageBubble({
  message,
  isFirstInGroup,
  isLastInGroup,
  selectMode,
  isSelected,
  onSelect,
  onForward,
  onReply,
  onReact,
  onCopy,
  onDownload,
  onImageClick,
  onVideoClick,
  onScrollToMessage,
  isHighlighted,
  isMounted,
  isMobile = false,
  searchQuery = "",
}: {
  message: Message;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  selectMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onForward?: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onCopy: () => void;
  onDownload?: () => void;
  onImageClick?: () => void;
  onVideoClick?: (url: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
  isMounted: boolean;
  isMobile?: boolean;
  searchQuery?: string;
}) {
  const isOutgoing = message.direction === "outgoing";
  const isMediaType = ["image", "video", "audio", "document", "sticker"].includes(message.type);
  const displayText = getMessageDisplayText(message);
  const [isHovered, setIsHovered] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // Check if this is an internal "You" message
  const isInternal = message.source === "internal" || message.isInternal;
  
  // Touch handlers for mobile swipe-to-reply and long-press
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!isMobile || selectMode) return;
    
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Start long press timer for context menu
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressed(true);
      // Trigger haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  }, [isMobile, selectMode]);
  
  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!isMobile || selectMode || !touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Cancel long press if moving
    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
    
    // Swipe to reply (left swipe for outgoing, right swipe for incoming)
    if (deltaY < 30 && onReply) {
      const swipeDirection = isOutgoing ? -1 : 1;
      const offset = Math.max(0, Math.min(80, deltaX * swipeDirection));
      setSwipeOffset(offset * swipeDirection);
    }
  }, [isMobile, selectMode, isOutgoing, onReply]);
  
  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    // Cancel long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    // Trigger reply if swiped far enough
    if (Math.abs(swipeOffset) > 60 && onReply) {
      onReply();
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
    
    // Reset state
    touchStartRef.current = null;
    setSwipeOffset(0);
    setIsLongPressed(false);
  }, [isMobile, swipeOffset, onReply]);

  const hasReactions = message.reactions && message.reactions.length > 0;

  return (
    <div
      className={cn(
        "flex gap-2 py-[1px] group relative",
        // Responsive padding - smaller on mobile
        "px-3 md:px-[63px]",
        isOutgoing ? "justify-end" : "justify-start",
        isFirstInGroup && "pt-1",
        isLastInGroup && "pb-1",
        hasReactions && "mb-3", // Extra margin when reactions are present
        // Touch feedback
        isMobile && "touch-manipulation"
      )}
      style={{
        transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
        transition: swipeOffset ? 'none' : 'transform 0.2s ease-out',
      }}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Checkbox for select mode */}
      {selectMode && (
        <div className="flex items-center">
          <Checkbox checked={isSelected} onCheckedChange={onSelect} />
        </div>
      )}

      {/* Forward button - left side for outgoing messages */}
      {!selectMode && isHovered && onForward && isOutgoing && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full self-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onForward}
              >
                <Forward className="h-4 w-4 text-[#8696a0]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Forward</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Swipe reply indicator */}
      {swipeOffset !== 0 && onReply && (
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center justify-center",
            "w-10 h-10 rounded-full bg-[#25d366] transition-opacity",
            Math.abs(swipeOffset) > 60 ? "opacity-100" : "opacity-50",
            isOutgoing ? "left-2" : "right-2"
          )}
        >
          <Reply className="h-5 w-5 text-white" />
        </div>
      )}
      
      {/* Message bubble */}
      <div
        ref={bubbleRef}
        data-message-id={message.messageId}
        className={cn(
          "relative rounded-lg shadow-sm transition-all duration-300",
          // Responsive max-width - wider on mobile for better readability
          "max-w-[85%] md:max-w-[65%]",
          // Internal "You" messages have distinct styling (blue tint like sticky notes)
          isInternal
            ? "bg-[#fff3cd] dark:bg-[#4a4000] border-l-4 border-[#ffc107]"
            : isOutgoing
              ? "bg-[#d9fdd3] dark:bg-[#005c4b]"
              : "bg-white dark:bg-[#202c33]",
          isFirstInGroup && isOutgoing && !isInternal && "rounded-tr-none",
          isFirstInGroup && !isOutgoing && "rounded-tl-none",
          isMediaType && message.mediaUrl ? "p-1" : "px-[9px] py-[6px]",
          // Highlight effect when scrolled to
          isHighlighted && "ring-2 ring-[#25d366] ring-opacity-75 bg-[#25d366]/10 dark:bg-[#25d366]/20",
          // Long press visual feedback
          isLongPressed && "scale-[0.98] brightness-95"
        )}
        onClick={selectMode ? onSelect : undefined}
      >
        {/* Bubble tail SVG */}
        {isFirstInGroup && (
          <div className={cn("absolute top-0 w-2 h-3", isOutgoing ? "-right-2" : "-left-2")}>
            <svg viewBox="0 0 8 13" width="8" height="13">
              <path
                fill={isOutgoing ? "#d9fdd3" : "#ffffff"}
                className={cn("dark:fill-[#005c4b]", !isOutgoing && "dark:fill-[#202c33]")}
                d={isOutgoing
                  ? "M1.533 3.568 8 12.193V1H2.812c-.705 0-1.28.607-1.28 1.356 0 .423.18.815.47 1.06z"
                  : "M6.467 3.568 0 12.193V1h5.188c.705 0 1.28.607 1.28 1.356 0 .423-.18.815-.47 1.06z"
                }
              />
            </svg>
          </div>
        )}

        {/* Internal message indicator */}
        {isInternal && (
          <div className="flex items-center gap-1 text-[11px] text-[#856404] dark:text-[#ffc107] mb-1 font-medium">
            <span>📝 Internal Note</span>
          </div>
        )}

        {/* Forwarded indicator */}
        {message.isForwarded && !isInternal && (
          <div className="flex items-center gap-1 text-[11px] text-[#667781] dark:text-[#8696a0] mb-1">
            <Forward className="h-3 w-3" />
            <span className="italic">Forwarded</span>
          </div>
        )}

        {/* Quoted message (reply context) - WhatsApp style */}
        {/* Support both old (quotedMessage) and new (replyContext) field names */}
        {(() => {
          const replyData = message.replyContext || message.quotedMessage;
          const replyToId = message.replyToMessageId || message.quotedMessageId;
          if (!replyData) return null;

          // Determine if original message was from same person
          const isOwnMessage = replyData.from === message.from;
          const quotedText = replyData.content?.text || replyData.content?.caption || 
            (replyData.type === "image" ? "📷 Photo" :
             replyData.type === "video" ? "🎬 Video" :
             replyData.type === "audio" ? "🎵 Audio" :
             replyData.type === "document" ? "📄 Document" :
             replyData.type === "sticker" ? "🎭 Sticker" :
             replyData.type === "unknown" ? "Message unavailable" : "Message");

          return (
            <div
              className={cn(
                "rounded-md mb-1 overflow-hidden cursor-pointer hover:brightness-95 transition-all",
                isOutgoing
                  ? "bg-[#c7f8ca]/60 dark:bg-[#025144]/60"
                  : "bg-[#f5f6f6] dark:bg-[#1d282f]"
              )}
              onClick={() => {
                if (replyToId && onScrollToMessage) {
                  onScrollToMessage(replyToId);
                }
              }}
            >
              <div className="flex">
                {/* Left accent bar - WhatsApp colors */}
                <div
                  className={cn(
                    "w-1 flex-shrink-0",
                    isOwnMessage
                      ? "bg-[#06cf9c]" // Green for own messages
                      : "bg-[#53bdeb]" // Blue for others
                  )}
                />
                <div className="flex-1 px-2 py-1.5 min-w-0">
                  {/* Sender name */}
                  <p
                    className={cn(
                      "text-[12.5px] font-medium truncate",
                      isOwnMessage
                        ? "text-[#06cf9c]"
                        : "text-[#53bdeb]"
                    )}
                  >
                    {isOwnMessage ? "You" : replyData.from}
                  </p>
                  {/* Quoted content */}
                  <div className="flex items-center gap-2">
                    {replyData.mediaUrl && (
                      <div className="w-10 h-10 rounded flex-shrink-0 bg-black/10 dark:bg-white/10 overflow-hidden">
                        {replyData.type === "image" || replyData.type === "sticker" ? (
                          <img
                            src={replyData.mediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : replyData.type === "video" ? (
                          <div className="w-full h-full flex items-center justify-center bg-black/20">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-4 w-4 text-[#8696a0]" />
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
                      {quotedText}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Upload progress for pending media */}
        {!message.mediaUrl && message.status === "sending" && isMediaType && (
          <div className="flex items-center justify-center p-8 bg-black/10 dark:bg-black/20 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-[#8696a0]" />
          </div>
        )}

        {/* Image/Sticker - Single image (not in group) */}
        {message.mediaUrl && (message.type === "image" || message.type === "sticker") && (
          <div className="relative">
            <div
              className="relative cursor-pointer flex items-center justify-center bg-black/5 dark:bg-black/20 rounded-lg overflow-hidden"
              style={{ minHeight: 220 }}
              onClick={onImageClick}
            >
              {!imageLoaded && (
                <Loader2 className="h-6 w-6 animate-spin text-[#8696a0]" />
              )}
              {message.status === "sending" && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
              <img
                src={message.mediaUrl}
                alt={displayText || "Image"}
                className={cn(
                  "max-w-full rounded-lg max-h-[330px] object-contain transition-opacity",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>
          </div>
        )}

        {/* Video */}
        {message.mediaUrl && message.type === "video" && (
          <div
            className="relative cursor-pointer group/video"
            onClick={(e) => {
              e.stopPropagation();
              if (onVideoClick) {
                onVideoClick(message.mediaUrl!);
              }
            }}
          >
            {message.status === "sending" && (
              <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <div className="relative">
              <video
                src={message.mediaUrl}
                className="max-w-full rounded-lg max-h-[330px] bg-black pointer-events-none"
                preload="metadata"
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/60 group-hover/video:bg-black/80 flex items-center justify-center transition-colors">
                  <Play className="h-7 w-7 text-white ml-1" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio */}
        {message.mediaUrl && message.type === "audio" && (
          <div className="flex items-center gap-3 p-2 min-w-[200px] md:min-w-[250px]">
            <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center flex-shrink-0">
              <Music className="h-5 w-5 text-white" />
            </div>
            <audio src={message.mediaUrl} controls className="flex-1 h-8" preload="metadata" />
          </div>
        )}

        {/* Document */}
        {message.mediaUrl && message.type === "document" && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg min-w-[200px] md:min-w-[250px]",
              isOutgoing
                ? "bg-[#c7f8ca] dark:bg-[#025144] hover:bg-[#b8f0bc] dark:hover:bg-[#024c3f]"
                : "bg-[#f5f6f6] dark:bg-[#1d282f] hover:bg-[#ebedef] dark:hover:bg-[#182229]"
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-[#8696a0] flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-[#111b21] dark:text-[#e9edef] truncate">
                {message.filename || "Document"}
              </p>
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">
                {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : "Document"}
              </p>
            </div>
            <Download className="h-5 w-5 text-[#8696a0] flex-shrink-0" />
          </a>
        )}

        {/* Location */}
        {message.type === "location" && typeof message.content === "object" && message.content?.location && (
          <a
            href={`https://www.google.com/maps?q=${message.content.location.latitude},${message.content.location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 rounded-lg bg-[#f5f6f6] dark:bg-[#1d282f] hover:bg-[#ebedef] dark:hover:bg-[#182229]"
          >
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span className="text-[14px] text-[#111b21] dark:text-[#e9edef]">
                {message.content.location.name || message.content.location.address || "View location"}
              </span>
            </div>
          </a>
        )}

        {/* Text content (including captions for media) */}
        {(() => {
          const caption =
            typeof message.content === "object" && message.content?.caption
              ? message.content.caption
              : "";

          if (isMediaType && message.mediaUrl) {
            if (caption) {
              return (
                <div className="px-1 pt-1">
                  <ReadMoreText text={caption} searchQuery={searchQuery} />
                </div>
              );
            }
            return null;
          }

          if (displayText && !displayText.startsWith("📷") && !displayText.startsWith("🎬")) {
            return <ReadMoreText text={displayText} searchQuery={searchQuery} />;
          }
          return null;
        })()}

        {/* Reactions - WhatsApp style (positioned at bottom, overlapping edge) */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={cn(
              "absolute -bottom-3 z-10",
              isOutgoing ? "left-1" : "right-1"
            )}
          >
            <div className="flex items-center bg-white dark:bg-[#202c33] rounded-full px-1.5 py-0.5 shadow-md border border-[#e9edef] dark:border-[#222d34]">
              {/* Group reactions by emoji and show count */}
              {(() => {
                const grouped = message.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                return Object.entries(grouped).map(([emoji, count]) => (
                  <span key={emoji} className="text-sm flex items-center">
                    {emoji}
                    {count > 1 && (
                      <span className="text-[10px] text-[#667781] dark:text-[#8696a0] ml-0.5">
                        {count}
                      </span>
                    )}
                  </span>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Timestamp and status */}
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1",
            isMediaType && message.mediaUrl && !(typeof message.content === "object" && message.content?.caption) && "absolute bottom-1 right-2"
          )}
        >
          <span
            className={cn(
              "text-[11px]",
              isMediaType && message.mediaUrl && !(typeof message.content === "object" && message.content?.caption)
                ? "text-white/90 drop-shadow-md"
                : "text-[#667781] dark:text-[#8696a0]"
            )}
          >
            {isMounted
              ? new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </span>
          {/* No status icons for internal messages (no delivery tracking) */}
          {isOutgoing && !isInternal && (
            <StatusIcon 
              status={message.status} 
              failureReason={message.failureReason}
              errorCode={message.failureReason?.code}
            />
          )}
        </div>

        {/* Hover menu - Always mounted, visibility controlled by CSS or long press on mobile */}
        {!selectMode && (
          <div
            className={cn(
              "absolute z-20",
              isOutgoing ? "-top-2 -left-3" : "-top-2 -right-3"
            )}
          >
            <DropdownMenu 
              modal={false} 
              open={isMobile ? isLongPressed : undefined}
              onOpenChange={(open) => {
                if (isMobile && !open) {
                  setIsLongPressed(false);
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-full transition-opacity duration-150",
                    // Larger touch target on mobile
                    "h-6 w-6 md:h-6 md:w-6",
                    // Show on hover (desktop) or hide on mobile (use long press instead)
                    isMobile 
                      ? "opacity-0 pointer-events-none" 
                      : isHovered 
                        ? "opacity-100" 
                        : "opacity-0 pointer-events-none",
                    isOutgoing
                      ? "bg-[#d9fdd3]/80 dark:bg-[#005c4b]/80 hover:bg-[#c7f8ca] dark:hover:bg-[#025144]"
                      : "bg-white/80 dark:bg-[#202c33]/80 hover:bg-[#f5f6f6] dark:hover:bg-[#2a3942]"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <ChevronDown className="h-4 w-4 text-[#8696a0]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isOutgoing ? "start" : "end"}
                side="top"
                sideOffset={6}
                className={cn(
                  "w-48",
                  // Mobile-optimized dropdown
                  isMobile && "min-w-[200px] p-1"
                )}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {onReply && (
                  <DropdownMenuItem 
                    onSelect={onReply}
                    className={cn(isMobile && "py-3 text-base")}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </DropdownMenuItem>
                )}
                {onReact && (
                  <>
                    <div className={cn(
                      "px-2 py-1.5 flex items-center justify-center gap-1",
                      isMobile && "py-2 gap-2"
                    )}>
                      {commonReactions.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReact(emoji);
                            if (isMobile) setIsLongPressed(false);
                          }}
                          className={cn(
                            "rounded-full hover:bg-[#f0f2f5] dark:hover:bg-[#374045] flex items-center justify-center transition-transform hover:scale-110",
                            // Larger touch targets on mobile
                            isMobile ? "w-10 h-10 text-xl" : "w-8 h-8 text-lg"
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                {onForward && (
                  <DropdownMenuItem 
                    onSelect={onForward}
                    className={cn(isMobile && "py-3 text-base")}
                  >
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onSelect={onCopy}
                  className={cn(isMobile && "py-3 text-base")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                {message.mediaUrl && onDownload && (
                  <DropdownMenuItem 
                    onSelect={onDownload}
                    className={cn(isMobile && "py-3 text-base")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Forward button - right side for incoming messages */}
      {!selectMode && isHovered && onForward && !isOutgoing && (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full self-center opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onForward}
              >
                <Forward className="h-4 w-4 text-[#8696a0]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Forward</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

export const MessageList = forwardRef<{ scrollToMessage: (messageId: string) => void }, MessageListProps>(({
  messages,
  messagesLoading,
  messageSearchQuery,
  messagesEndRef,
  selectedConversationActive,
  onLoadOlderMessages,
  hasMoreMessages,
  loadingOlderMessages,
  onForwardMessages,
  conversations = [],
  onReplyMessage,
  onReactMessage,
  isMobile = false,
  pendingScrollToMessageId,
  onScrolledToMessage,
}, ref) => {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isPullingToRefresh, setIsPullingToRefresh] = useState(false);
  const pullStartYRef = useRef<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const el = container.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }, []);

  useImperativeHandle(ref, () => ({ scrollToMessage }), [scrollToMessage]);

  const handleScrollToMessage = scrollToMessage;

  // Handle pending scroll to message from search results
  useEffect(() => {
    if (pendingScrollToMessageId && messages.length > 0 && !messagesLoading) {
      // Wait a bit for the DOM to render
      const timer = setTimeout(() => {
        handleScrollToMessage(pendingScrollToMessageId);
        if (onScrolledToMessage) {
          onScrolledToMessage();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingScrollToMessageId, messages.length, messagesLoading, handleScrollToMessage, onScrolledToMessage]);

  // Get all images from messages for gallery navigation
  const imageMessages = useMemo(() => {
    return messages.filter((m) => (m.type === "image" || m.type === "sticker") && m.mediaUrl);
  }, [messages]);

  // Handle scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;

    setIsNearBottom(nearBottom);
    if (nearBottom) setShowNewMessagesButton(false);

    if (scrollTop < 50 && hasMoreMessages && !loadingOlderMessages && onLoadOlderMessages) {
      onLoadOlderMessages();
    }
  }, [hasMoreMessages, loadingOlderMessages, onLoadOlderMessages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Track previous message count and initial load
  const prevMessageCountRef = useRef(messages.length);
  const hasScrolledInitiallyRef = useRef(false);
  
  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledInitiallyRef.current && !messagesLoading) {
      // First time messages loaded - scroll to bottom instantly
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
        hasScrolledInitiallyRef.current = true;
      }, 50);
    }
  }, [messages.length, messagesLoading, messagesEndRef]);
  
  // Reset scroll flag when conversation changes (messages become empty)
  useEffect(() => {
    if (messages.length === 0) {
      hasScrolledInitiallyRef.current = false;
    }
  }, [messages.length]);
  
  // Handle new messages arriving (after initial load)
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessageCountRef.current;
    const isPrependingOld = messages.length > prevMessageCountRef.current && 
                            prevMessageCountRef.current > 0 &&
                            !isNearBottom;
    
    prevMessageCountRef.current = messages.length;
    
    // Only auto-scroll if:
    // 1. There are new messages (not prepending old messages)
    // 2. User is already near bottom
    // 3. Initial scroll has already happened
    if (hasNewMessages && isNearBottom && hasScrolledInitiallyRef.current && !isPrependingOld) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (hasNewMessages && !isNearBottom && hasScrolledInitiallyRef.current && !isPrependingOld) {
      // Show "new messages" button if user scrolled up
      setShowNewMessagesButton(true);
    }
  }, [messages.length, isNearBottom, messagesEndRef]);

  // Filter messages by search
  const filteredMessages = useMemo(
    () =>
      messages.filter((msg) => {
        if (!messageSearchQuery) return true;
        const displayText = getMessageDisplayText(msg);
        return displayText.toLowerCase().includes(messageSearchQuery.toLowerCase());
      }),
    [messages, messageSearchQuery]
  );

  // Group messages with image clustering
  type GroupedItem =
    | { type: "message"; date?: string; message: Message; isFirstInGroup: boolean; isLastInGroup: boolean }
    | { type: "imageGroup"; date?: string; images: Message[] };

  const groupedMessages = useMemo(() => {
    if (!isMounted) return filteredMessages.map((m) => ({ type: "message" as const, date: undefined, message: m, isFirstInGroup: true, isLastInGroup: true }));

    const result: GroupedItem[] = [];
    let lastDate: string | undefined;
    let currentImageGroup: Message[] = [];
    let imageGroupDirection: "incoming" | "outgoing" | null = null;
    let imageGroupFrom: string | null = null;

    const flushImageGroup = (showDate?: string) => {
      if (currentImageGroup.length >= 2) {
        result.push({ type: "imageGroup", date: showDate, images: [...currentImageGroup] });
      } else if (currentImageGroup.length === 1) {
        // Single image - render as regular message
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

      // Date separator check
      const showDate = !lastDate || !isSameDay(messageDate, new Date(filteredMessages[idx - 1]?.timestamp));
      if (showDate) {
        // Flush any pending image group before date change
        if (currentImageGroup.length > 0) {
          flushImageGroup();
        }
        lastDate = formatDateSeparator(messageDate);
      }

      const isImage = (message.type === "image" || message.type === "sticker") && message.mediaUrl;
      const hasCaption = isImage && typeof message.content === "object" && message.content?.caption && message.content.caption.trim();

      // Check if we should continue current image group
      const shouldContinueGroup =
        isImage &&
        !hasCaption &&
        currentImageGroup.length > 0 &&
        message.direction === imageGroupDirection &&
        message.from === imageGroupFrom &&
        // Within 2 minutes of the first image in group
        Math.abs(new Date(message.timestamp).getTime() - new Date(currentImageGroup[0].timestamp).getTime()) < 2 * 60 * 1000;

      if (shouldContinueGroup) {
        currentImageGroup.push(message);
        } else {
          // Flush current group
          flushImageGroup(showDate ? lastDate : undefined);

        if (isImage && !hasCaption) {
          // Start new image group (only for images without captions)
          currentImageGroup = [message];
          imageGroupDirection = message.direction;
          imageGroupFrom = message.from;
        } else if (isImage && hasCaption) {
          // Image with caption - render as regular message
          const isFirstInGroup =
            !prevMessage ||
            prevMessage.direction !== message.direction ||
            prevMessage.from !== message.from ||
            Math.abs(new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime()) > 60000 ||
            showDate;

          const isLastInGroup =
            !nextMessage ||
            nextMessage.direction !== message.direction ||
            nextMessage.from !== message.from ||
            Math.abs(new Date(nextMessage.timestamp).getTime() - new Date(message.timestamp).getTime()) > 60000 ||
            (nextMessage && !isSameDay(new Date(nextMessage.timestamp), messageDate));

          result.push({
            type: "message",
            date: showDate ? lastDate : undefined,
            message,
            isFirstInGroup,
            isLastInGroup,
          });
        } else {
          // Regular message
          const isFirstInGroup =
            !prevMessage ||
            prevMessage.direction !== message.direction ||
            prevMessage.from !== message.from ||
            Math.abs(new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime()) > 60000 ||
            showDate;

          const isLastInGroup =
            !nextMessage ||
            nextMessage.direction !== message.direction ||
            nextMessage.from !== message.from ||
            Math.abs(new Date(nextMessage.timestamp).getTime() - new Date(message.timestamp).getTime()) > 60000 ||
            (nextMessage && !isSameDay(new Date(nextMessage.timestamp), messageDate));

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

    // Flush remaining image group
    flushImageGroup();

    return result;
  }, [filteredMessages, isMounted]);

  // Handlers
  const handleCopy = useCallback((message: Message) => {
    const text = message.mediaUrl || getMessageDisplayText(message);
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied", description: message.mediaUrl ? "URL copied" : "Text copied" });
    });
  }, [toast]);

  const handleDownload = useCallback((message: Message) => {
    if (!message.mediaUrl) return;
    const link = document.createElement("a");
    link.href = message.mediaUrl;
    link.download = message.filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleSelect = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) newSet.delete(messageId);
      else newSet.add(messageId);
      return newSet;
    });
  }, []);

  const handleForward = useCallback(() => {
    if (selectedMessageIds.size > 0 && onForwardMessages) {
      onForwardMessages(Array.from(selectedMessageIds));
      setSelectMode(false);
      setSelectedMessageIds(new Set());
    }
  }, [selectedMessageIds, onForwardMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMessagesButton(false);
  }, [messagesEndRef]);

  const handleImageClick = useCallback((url: string, groupIndex?: number) => {
    setSelectedImageUrl(url);
    const idx = imageMessages.findIndex((m) => m.mediaUrl === url);
    setCurrentImageIndex(idx >= 0 ? idx : 0);
  }, [imageMessages]);

  const getCurrentImageMessage = useCallback(() => {
    if (selectedImageUrl && imageMessages.length > 0) {
      return imageMessages[currentImageIndex] || imageMessages.find(m => m.mediaUrl === selectedImageUrl);
    }
    return null;
  }, [selectedImageUrl, currentImageIndex, imageMessages]);

  // Pull to refresh handler for mobile
  const handlePullTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !scrollContainerRef.current) return;
    
    // Only enable pull-to-refresh when at top of scroll
    if (scrollContainerRef.current.scrollTop === 0 && hasMoreMessages) {
      pullStartYRef.current = e.touches[0].clientY;
    }
  }, [isMobile, hasMoreMessages]);
  
  const handlePullTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || pullStartYRef.current === null || !scrollContainerRef.current) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartYRef.current;
    
    if (diff > 50 && scrollContainerRef.current.scrollTop === 0) {
      setIsPullingToRefresh(true);
    } else {
      setIsPullingToRefresh(false);
    }
  }, [isMobile]);
  
  const handlePullTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    if (isPullingToRefresh && hasMoreMessages && onLoadOlderMessages && !loadingOlderMessages) {
      onLoadOlderMessages();
    }
    
    pullStartYRef.current = null;
    setIsPullingToRefresh(false);
  }, [isMobile, isPullingToRefresh, hasMoreMessages, onLoadOlderMessages, loadingOlderMessages]);

  return (
    <div className="relative flex-1 flex flex-col overflow-x-hidden bg-[#efeae2] dark:bg-[#0b141a] min-h-0">
      {/* WhatsApp wallpaper pattern overlay */}
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFY0lEQVR4nO2Z2W4TURSAZ/R/rAQEE0JY0gnZJrMkM0lnMpNJMrMkEwIJYRGIRUhcwAVw7+HGG27ggqeAG97AoAC6AAAAAAAAAAAAAAD+t7iu++u+l5Cs2vLAshFCUGkbmA3Dh4APX3wBf37+Bb59+4Z+/f1v9O37d4TH59Ffv/9BHn38PfTp0y/o4/OP0O9+/gn98scfKPbbH+j3P/2Ifvr5Z/TLH/+EffH7n+jzb78HX/71F/j863dk+eUX+NP3P0T+8O13dPiPP6LPv/0e+vjFZ8j806fIx48fo88/fEKfv/5M/Pj6NeTXb7+Ab79+A719+xZ6//Ej+u7rd+jNl5+Q558+Iz+9+Rr59NNn9MOHD8iHd+/QT+/foW8+vEXvf/yE3n37Eb394TN6//0P6NuP79C3Hz8gH959RN9/+IK+/vAJff3lO+T9l6/I55++oy8/fkNvPn1CP374iv74/S/Qu6/fwb9/+B79/fv34F+++gV89+l78Pcvv0L/+OUn+M8vvoEf//qCvv/6LfLq1RvkzZs36OXLl8izZ8/Qs+cv0JuPn9Gr12/Ruy8/oJ9evEJPn75AT548QY+ePEHPX75C3738gj55/gp59PIL+uzZK/Ty5UfkzZfvkbefvqNvvvqMvn77Frn3+Bl69foz8vLFG+Thoyfo9ZsP6LN3X9CLb76gL96+R+4+eIKePn+N3n34GDl+/x68++Qp+uLDJ+TFq3fo8dNn6OrVq+jBvTvo3r078PTZSwShPwAAAAAAAAAAaB9v3rx5cPny5ftDQ0PbExMT/6alpT2lp6d7MzMznTk5Ofa8vDxXQUGBp7Cw0FVcXOwuKSlxlpWVOcvKyhwVFRX2ioqK9RUVFRaqqqqsqamp+tHR0XUjI8PWkZGRxpGRkWXD4+Prh4eHV4+MjKwaHR1dNjo6unx0dHTZ2NjYktHR0cXjY2MLxsbGFoyPjy8YHx8fHx8fnzM+Pj57fHz81Pj4+PTY2NjpkZGRGaOjo9NHR0dPGB0dnTA0NDRucHBw3NDQ0NjBwcExo6OjY4aGhsYMDg6OHhoaGjM8PDxmeHh4zMjIyJjR0dHRo6OjY4aHh8cNDQ2NGxwcHDcwMDB+YGBg/MDA4PjBwaHxAwNDE8bGxicMDAxOGBgYmjg4ODBpaGhg0tDQ4KShwcFJg4ODkwcHBycPDg1NHhoamjI0NDR1aGhw6tDQ4LTh4cHpw8MDM4aGBmYODw/MHB4enDU8PDR7eHhozsjI0Jzh4eE5o6PDc0dGhueNjAzPHx0dnj86MrJgZGRk4cjI8KLR0ZHFo6Mji0dHRpeOjIwsHR0dXTY6OrJ8dHR0xejo6MrR0dFVY2Ojq8bGRlePjo6tGRsbXTs2NrZ+bGxs/djY+IaxsfENY2Pjm8fGJjaNjU1sGh+f2DwxPrllfHxyy8TExJbJicmtExOTWycmJrdOTk5tm5yc2D41NbF9cnJyx9TU5M6pqcmdU1OTu6amJnfv2TO1Z/fuyb27d0/t3bNnas/u3VP79uye2rdn9559e3bvP7Bn94F9+/YeOLBv34GD+/cfPLh//8FD+/cfPHRg/4HDhw4cPHzwwMEjhw4cPHLowMGjhw8ePHbk4MFjRw4dOnbk0KHjhw8fOn748KETx44eOXns2JGTJ44fPXXi+JHTx48fOXPi+JHTx48fOXvq1NGzp06dOHf69Ikfzp07ceb8uZPnfzh35syF8+fPXLhw/sy/L144c/HCuTOXLp47d/nShXNXLl04d/XyhfPXrlw8f+36pfPXrl+8cOPqxfM3r128cOvq1Uu3rl25eOva1Ut3r1+7dO/G9cv3b1y7fP/mtcsP7964evnRvRtXHz68dfXxo1vXHj26ff3xo9vXnz66c/PJo9s3nz66c+vpkzu3/gO+1sPH54TYJgAAAABJRU5ErkJggg==')]" />

      {/* Pull to refresh indicator for mobile */}
      {isMobile && isPullingToRefresh && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center py-3 bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin text-[#25d366] mr-2" />
          <span className="text-sm text-[#667781] dark:text-[#8696a0]">
            Release to load earlier messages
          </span>
        </div>
      )}

      {/* Messages container */}
      <div 
        ref={scrollContainerRef} 
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2",
          // Enable smooth scrolling and momentum on mobile
          isMobile && "scroll-smooth overscroll-contain",
          // Performance optimization for mobile
          isMobile && "will-change-scroll"
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handlePullTouchStart}
        onTouchMove={handlePullTouchMove}
        onTouchEnd={handlePullTouchEnd}
      >
        {/* Load older messages button */}
        {hasMoreMessages && onLoadOlderMessages && (
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadOlderMessages}
              disabled={loadingOlderMessages}
              className="bg-white dark:bg-[#202c33] text-[#008069] dark:text-[#00a884] rounded-full px-4 shadow-sm"
            >
              {loadingOlderMessages && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Load earlier messages
            </Button>
          </div>
        )}

        {/* Loading state */}
        {messagesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#25d366]" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="bg-white dark:bg-[#202c33] rounded-lg p-6 shadow-sm">
              <p className="text-[17px] text-[#111b21] dark:text-[#e9edef] mb-1">
                {selectedConversationActive ? "No messages yet" : "Select a conversation"}
              </p>
              <p className="text-[14px] text-[#667781] dark:text-[#8696a0]">
                Send a message to start chatting
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map((item, idx) => {
            if (item.type === "imageGroup") {
              return (
                <div key={`img-group-${idx}`}>
                  {item.date && (
                    <div className="flex justify-center py-2">
                      <div className="bg-white dark:bg-[#202c33] rounded-lg px-3 py-1 shadow-sm">
                        <span className="text-[12.5px] text-[#54656f] dark:text-[#8696a0] font-medium">
                          {item.date}
                        </span>
                      </div>
                    </div>
                  )}
                  <ImageGroup
                    images={item.images}
                    isOutgoing={item.images[0].direction === "outgoing"}
                    onImageClick={handleImageClick}
                    onForward={
                      onForwardMessages
                        ? (ids) => {
                            setSelectMode(true);
                            setSelectedMessageIds(new Set(ids));
                          }
                        : undefined
                    }
                    selectMode={selectMode}
                    selectedIds={selectedMessageIds}
                    onSelect={handleSelect}
                    isMounted={isMounted}
                  />
                </div>
              );
            }

            const msgId = item.message._id || item.message.messageId;
            return (
              <div key={`${msgId}-${idx}`}>
                {item.date && (
                  <div className="flex justify-center py-2">
                    <div className="bg-white dark:bg-[#202c33] rounded-lg px-3 py-1 shadow-sm">
                      <span className="text-[12.5px] text-[#54656f] dark:text-[#8696a0] font-medium">
                        {item.date}
                      </span>
                    </div>
                  </div>
                )}
                <MessageBubble
                  message={item.message}
                  isFirstInGroup={item.isFirstInGroup}
                  isLastInGroup={item.isLastInGroup}
                  selectMode={selectMode}
                  isSelected={selectedMessageIds.has(msgId)}
                  onSelect={() => handleSelect(msgId)}
                  onForward={
                    onForwardMessages
                      ? () => {
                          setSelectMode(true);
                          setSelectedMessageIds(new Set([msgId]));
                        }
                      : undefined
                  }
                  onReply={onReplyMessage ? () => onReplyMessage(item.message) : undefined}
                  onReact={onReactMessage ? (emoji) => onReactMessage(item.message, emoji) : undefined}
                  onCopy={() => handleCopy(item.message)}
                  onDownload={item.message.mediaUrl ? () => handleDownload(item.message) : undefined}
                  onImageClick={
                    (item.message.type === "image" || item.message.type === "sticker") && item.message.mediaUrl
                      ? () => handleImageClick(item.message.mediaUrl!)
                      : undefined
                  }
                  onVideoClick={
                    item.message.type === "video" && item.message.mediaUrl
                      ? (url) => setSelectedVideoUrl(url)
                      : undefined
                  }
                  onScrollToMessage={handleScrollToMessage}
                  isHighlighted={highlightedMessageId === item.message.messageId}
                  isMounted={isMounted}
                  isMobile={isMobile}
                  searchQuery={messageSearchQuery}
                />
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* New messages button - repositioned for mobile */}
      {showNewMessagesButton && (
        <button
          onClick={scrollToBottom}
          className={cn(
            "absolute z-20 bg-white dark:bg-[#202c33] text-[#008069] dark:text-[#00a884] rounded-full shadow-lg flex items-center gap-1 hover:bg-[#f0f2f5] dark:hover:bg-[#2a3942] active:scale-95 transition-all",
            // Mobile: centered at bottom, larger touch target
            isMobile 
              ? "bottom-4 left-1/2 -translate-x-1/2 px-4 py-3 min-h-[44px]" 
              : "bottom-4 right-4 px-4 py-2"
          )}
        >
          <ArrowDown className="h-5 w-5" />
          <span className="text-[12px] font-medium">New messages</span>
        </button>
      )}

      {/* Selection action bar - mobile optimized */}
      {selectMode && selectedMessageIds.size > 0 && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 bg-white dark:bg-[#202c33] shadow-lg flex items-center gap-3 z-20",
          // Mobile: full width bottom bar with larger touch targets
          isMobile 
            ? "bottom-0 left-0 right-0 translate-x-0 rounded-t-2xl px-4 py-4 pb-safe" 
            : "bottom-4 rounded-full px-4 py-2"
        )}>
          <span className={cn(
            "text-[#111b21] dark:text-[#e9edef]",
            isMobile ? "text-base font-medium" : "text-[14px]"
          )}>
            {selectedMessageIds.size} selected
          </span>
          <Button
            size={isMobile ? "default" : "sm"}
            onClick={handleForward}
            className={cn(
              "bg-[#25d366] hover:bg-[#1da851] text-white rounded-full active:scale-95 transition-transform",
              isMobile && "h-11 px-6"
            )}
          >
            <Forward className="h-4 w-4 mr-1" />
            Forward
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectMode(false);
              setSelectedMessageIds(new Set());
            }}
            className={cn(
              "rounded-full active:scale-95 transition-transform",
              isMobile ? "h-11 w-11" : "h-8 w-8"
            )}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Image lightbox - mobile optimized with full screen */}
      <Dialog
        open={!!selectedImageUrl}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImageUrl(null);
            setCurrentImageIndex(0);
          }
        }}
      >
        <DialogContent className={cn(
          "p-0 bg-black/95 border-0",
          // Full screen on mobile
          isMobile 
            ? "w-screen h-screen max-w-none max-h-none rounded-none" 
            : "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]"
        )}>
          <DialogTitle className="sr-only">Image viewer</DialogTitle>
          {selectedImageUrl && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Toolbar for image actions - repositioned for mobile */}
              {imageMessages.length > 0 && (
                <div className={cn(
                  "absolute z-30 flex items-center gap-2 bg-black/40 rounded-full",
                  isMobile 
                    ? "bottom-safe bottom-20 left-1/2 -translate-x-1/2 px-4 py-2" 
                    : "top-4 left-4 px-3 py-1.5"
                )}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-white hover:bg-black/60 rounded-full active:scale-95",
                      isMobile ? "h-11 w-11" : "h-8 w-8"
                    )}
                    onClick={() => {
                      const msg = imageMessages[currentImageIndex];
                      handleDownload(msg);
                    }}
                  >
                    <Download className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
                  </Button>
                  {onForwardMessages && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-white hover:bg-black/60 rounded-full active:scale-95",
                        isMobile ? "h-11 w-11" : "h-8 w-8"
                      )}
                      onClick={() => {
                        const msg = imageMessages[currentImageIndex];
                        const id = msg._id || msg.messageId;
                        if (id) {
                          onForwardMessages([id]);
                        }
                      }}
                    >
                      <Forward className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
                    </Button>
                  )}
                  {onReactMessage && (
                    <div className="flex items-center gap-1">
                      {commonReactions.slice(0, 3).map((emoji) => (
                        <button
                          key={emoji}
                          className={cn(
                            "rounded-full bg-black/30 hover:bg-black/60 flex items-center justify-center active:scale-95",
                            isMobile ? "w-10 h-10 text-xl" : "w-7 h-7 text-lg"
                          )}
                          onClick={() => {
                            const msg = imageMessages[currentImageIndex];
                            onReactMessage(msg, emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation arrows */}
              {imageMessages.length > 1 && currentImageIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute left-2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full",
                    isMobile ? "h-10 w-10" : "h-12 w-12"
                  )}
                  onClick={() => {
                    const prev = currentImageIndex - 1;
                    setCurrentImageIndex(prev);
                    setSelectedImageUrl(imageMessages[prev].mediaUrl || null);
                  }}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Image with touch support for mobile */}
              <div className="flex flex-col items-center justify-center w-full h-full p-4">
                <img 
                  src={selectedImageUrl} 
                  alt="Full size" 
                  className={cn(
                    "max-w-full max-h-[calc(100vh-200px)] object-contain",
                    // Enable touch manipulation for pinch-to-zoom
                    isMobile && "touch-manipulation"
                  )}
                  style={isMobile ? { touchAction: 'manipulation' } : undefined}
                />
                {/* Caption and status below image */}
                {(() => {
                  const currentMsg = getCurrentImageMessage();
                  if (!currentMsg) return null;
                  const caption = typeof currentMsg.content === "object" && currentMsg.content?.caption ? currentMsg.content.caption : null;
                  const hasCaption = caption && caption.trim();
                  
                  return (hasCaption || currentMsg.direction === "outgoing") ? (
                    <div className={cn(
                      "mt-4 max-w-2xl w-full flex items-center justify-between gap-4",
                      isMobile ? "px-4" : "px-8"
                    )}>
                      {hasCaption && (
                        <p className="text-white text-sm flex-1 text-center">
                          {caption}
                        </p>
                      )}
                      {currentMsg.direction === "outgoing" && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <StatusIcon 
                            status={currentMsg.status} 
                            failureReason={currentMsg.failureReason}
                            errorCode={currentMsg.failureReason?.code}
                          />
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
              </div>

              {imageMessages.length > 1 && currentImageIndex < imageMessages.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-2 z-20 bg-black/50 hover:bg-black/70 text-white rounded-full",
                    isMobile ? "h-10 w-10" : "h-12 w-12"
                  )}
                  onClick={() => {
                    const next = currentImageIndex + 1;
                    setCurrentImageIndex(next);
                    setSelectedImageUrl(imageMessages[next].mediaUrl || null);
                  }}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              {imageMessages.length > 1 && (
                <div className={cn(
                  "absolute left-1/2 -translate-x-1/2 bg-black/60 text-white rounded-full text-sm",
                  isMobile ? "top-safe top-4 px-4 py-2" : "bottom-4 px-4 py-1.5"
                )}>
                  {currentImageIndex + 1} / {imageMessages.length}
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute z-20 bg-black/50 hover:bg-black/70 text-white rounded-full active:scale-95",
                  isMobile ? "top-safe top-4 right-4 h-11 w-11" : "top-4 right-4 h-10 w-10"
                )}
                onClick={() => {
                  setSelectedImageUrl(null);
                  setCurrentImageIndex(0);
                }}
              >
                <X className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video lightbox - mobile optimized */}
      <Dialog
        open={!!selectedVideoUrl}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVideoUrl(null);
          }
        }}
      >
        <DialogContent className={cn(
          "p-0 bg-black/95 border-0 [&>button]:hidden",
          isMobile 
            ? "w-screen h-screen max-w-none max-h-none rounded-none" 
            : "w-[95vw] h-[95vh] max-w-[95vw] max-h-[95vh]"
        )}>
          <DialogTitle className="sr-only">Video player</DialogTitle>
          {selectedVideoUrl && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                src={selectedVideoUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-full object-contain bg-black"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute z-20 bg-black/50 hover:bg-black/70 text-white rounded-full active:scale-95",
                  isMobile ? "top-safe top-4 right-4 h-11 w-11" : "top-4 right-4 h-10 w-10"
                )}
                onClick={() => setSelectedVideoUrl(null)}
              >
                <X className={cn(isMobile ? "h-6 w-6" : "h-5 w-5")} />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

MessageList.displayName = "MessageList";
