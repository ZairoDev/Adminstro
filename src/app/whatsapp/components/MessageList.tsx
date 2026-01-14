import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";
import { getMessageDisplayText } from "../utils";
import { FileText, Forward, Download, X, Check, MoreVertical, Copy, Reply, Smile, ChevronLeft, ChevronRight, Film, Music } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

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
}

const statusInfo = (status: Message["status"]) => {
  switch (status) {
    case "sending":
      return { icon: <Clock className="h-3.5 w-3.5" />, label: "Sending...", color: "text-gray-300" };
    case "sent":
      return { icon: <Check className="h-3.5 w-3.5" />, label: "Sent", color: "text-gray-300" };
    case "delivered":
      return { icon: <CheckCheck className="h-3.5 w-3.5" />, label: "Delivered", color: "text-gray-300" };
    case "read":
      return { icon: <CheckCheck className="h-3.5 w-3.5" />, label: "Read", color: "text-blue-400" };
    case "failed":
      return { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Failed", color: "text-red-400" };
    default:
      return null;
  }
};

// Helper function to format date separator
function formatDateSeparator(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === today.getTime()) {
    return "Today";
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return messageDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

// Helper function to check if two dates are on the same day
function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() === d2.getTime();
}

export function MessageList({
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
}: MessageListProps) {
  const { toast } = useToast();
  // Track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageGroup, setSelectedImageGroup] = useState<Message[] | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle download
  const handleDownload = (message: Message) => {
    if (!message.mediaUrl) return;
    
    const link = document.createElement("a");
    link.href = message.mediaUrl;
    link.download = message.filename || `download.${message.mediaUrl.split('.').pop()?.split('?')[0] || 'bin'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle copy message
  const handleCopy = (message: Message) => {
    // For media messages, copy the URL; for text, copy the text
    if (message.mediaUrl) {
      navigator.clipboard.writeText(message.mediaUrl).then(() => {
        toast({
          title: "Copied",
          description: "Media URL copied to clipboard. You can paste and send it to others.",
        });
      });
    } else {
      const textToCopy = getMessageDisplayText(message);
      navigator.clipboard.writeText(textToCopy).then(() => {
        toast({
          title: "Copied",
          description: "Message text copied to clipboard",
        });
      });
    }
  };

  // Handle reply
  const handleReply = (message: Message) => {
    if (onReplyMessage) {
      onReplyMessage(message);
    }
  };

  // Handle react
  const handleReact = (message: Message, emoji: string = "👍") => {
    if (onReactMessage) {
      onReactMessage(message, emoji);
    }
  };

  // Common emoji reactions
  const commonReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // Handle message selection
  const handleMessageSelect = (messageId: string) => {
    if (!selectMode) return;
    setSelectedMessageIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Handle long press to enter select mode
  const handleMouseDown = (messageId: string) => {
    if (selectMode) return;
    const timer = setTimeout(() => {
      setSelectMode(true);
      setSelectedMessageIds(new Set([messageId]));
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Exit select mode
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedMessageIds(new Set());
  };

  // Handle forward
  const handleForward = () => {
    if (selectedMessageIds.size > 0 && onForwardMessages) {
      onForwardMessages(Array.from(selectedMessageIds));
      exitSelectMode();
    }
  };

  const filteredMessages = useMemo(
    () =>
      messages.filter((msg) => {
        if (!messageSearchQuery) return true;
        const displayText = getMessageDisplayText(msg);
        return displayText.toLowerCase().includes(messageSearchQuery.toLowerCase());
      }),
    [messages, messageSearchQuery]
  );

  // Group messages by date and group consecutive images (only after mount to avoid hydration issues)
  const messagesWithDates = useMemo(() => {
    type GroupedItem = { date?: string; message: Message } | { date?: string; imageGroup: Message[] };
    const grouped: GroupedItem[] = [];
    
    if (!isMounted) {
      // During SSR, don't show date separators to avoid hydration mismatch
      return filteredMessages.map((message) => ({ message }));
    }

    let lastDate: string | undefined = undefined;
    let currentImageGroup: Message[] = [];
    let currentImageGroupDate: string | undefined = undefined;
    let lastGroupDirection: "incoming" | "outgoing" | null = null;
    let lastGroupFrom: string | null = null;
    let lastGroupTimestamp: Date | null = null;

    const flushImageGroup = () => {
      if (currentImageGroup.length > 0) {
        // Only group if there are 2 or more images
        if (currentImageGroup.length >= 2) {
          if (currentImageGroupDate) {
            grouped.push({ date: currentImageGroupDate, imageGroup: [...currentImageGroup] });
          } else {
            grouped.push({ imageGroup: [...currentImageGroup] });
          }
        } else {
          // Single image, add as regular message
          if (currentImageGroupDate) {
            grouped.push({ date: currentImageGroupDate, message: currentImageGroup[0] });
          } else {
            grouped.push({ message: currentImageGroup[0] });
          }
        }
        currentImageGroup = [];
        currentImageGroupDate = undefined;
      }
    };

    filteredMessages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp);
      const shouldShowDate =
        index === 0 || !lastDate || !isSameDay(messageDate, new Date(filteredMessages[index - 1].timestamp));

      // Check if this is an image message
      const isImage = (message.type === "image" || message.type === "sticker") && message.mediaUrl;
      
      // Check if we should continue the current image group
      const shouldContinueGroup = 
        isImage &&
        currentImageGroup.length > 0 &&
        message.direction === lastGroupDirection &&
        message.from === lastGroupFrom &&
        lastGroupTimestamp &&
        // Within 2 minutes of the last image
        Math.abs(new Date(message.timestamp).getTime() - lastGroupTimestamp.getTime()) < 2 * 60 * 1000;

      if (shouldShowDate) {
        // Flush any pending image group before adding date separator
        flushImageGroup();
        lastDate = formatDateSeparator(messageDate);
      }

      if (shouldContinueGroup) {
        // Add to current image group
        currentImageGroup.push(message);
        lastGroupTimestamp = new Date(message.timestamp);
      } else {
        // Flush current group and start new one
        flushImageGroup();
        
        if (isImage) {
          // Start new image group
          currentImageGroup = [message];
          currentImageGroupDate = shouldShowDate ? lastDate : undefined;
          lastGroupDirection = message.direction;
          lastGroupFrom = message.from;
          lastGroupTimestamp = new Date(message.timestamp);
          
          // Don't add to grouped yet - wait to see if more images follow
        } else {
          // Regular message
          if (shouldShowDate) {
            grouped.push({ date: lastDate, message });
          } else {
            grouped.push({ message });
          }
        }
      }
    });

    // Flush any remaining image group
    flushImageGroup();

    return grouped;
  }, [filteredMessages, isMounted]);

  return (
    <div className="relative h-full">
      <ScrollArea className="h-full pr-4">
        <div className="space-y-4">
        {/* Load Older Messages Button */}
        {hasMoreMessages && onLoadOlderMessages && (
          <div className="flex justify-center py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadOlderMessages}
              disabled={loadingOlderMessages}
              className="text-muted-foreground"
            >
              {loadingOlderMessages ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load older messages"
              )}
            </Button>
          </div>
        )}

        {messagesLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
            <p className="text-lg font-medium">
              {selectedConversationActive ? "No messages yet" : "Select a conversation"}
            </p>
            <p className="text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          messagesWithDates.map((item, index) => {
            // Handle image groups
            if ("imageGroup" in item && item.imageGroup && item.imageGroup.length >= 2) {
              const date = "date" in item ? item.date : undefined;
              const imageGroup = item.imageGroup;
              const groupDirection = imageGroup[0].direction;
              const getGridCols = (count: number) => {
                if (count === 1) return "grid-cols-1";
                if (count === 2) return "grid-cols-2";
                if (count === 3) return "grid-cols-2"; // 2 columns, last one spans
                if (count === 4) return "grid-cols-2";
                return "grid-cols-2"; // Default to 2 columns for 5+
              };
              
              // Limit display to first 4 images, show "+N" overlay on 4th if more
              const displayImages = imageGroup.slice(0, 4);
              const remainingCount = imageGroup.length > 4 ? imageGroup.length - 4 : 0;

              return (
                <div key={`image-group-${imageGroup[0]._id || imageGroup[0].messageId}-${index}`}>
                  {/* Date Separator */}
                  {date ? (
                    <div className="flex justify-center my-4">
                      <div className="bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
                        {date}
                      </div>
                    </div>
                  ) : null}
                  {/* Image Group */}
                  <div
                    className={cn(
                      "flex gap-2 items-start group",
                      groupDirection === "outgoing" ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <div className="flex items-start pt-3">
                        <Checkbox
                          checked={imageGroup.every(msg => selectedMessageIds.has(msg._id || msg.messageId))}
                          onCheckedChange={() => {
                            imageGroup.forEach(msg => handleMessageSelect(msg._id || msg.messageId));
                          }}
                        />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[35%] rounded-lg p-2 relative group",
                        groupDirection === "outgoing" ? "bg-green-800" : "bg-muted"
                      )}
                    >
                      {/* Menu button at top right */}
                      {!selectMode && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-6 w-6",
                                  groupDirection === "outgoing"
                                    ? "text-white hover:bg-white/20"
                                    : "hover:bg-muted-foreground/10"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {onForwardMessages && (
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectMode(true);
                                    setSelectedMessageIds(new Set(imageGroup.map(msg => msg._id || msg.messageId)));
                                  }}
                                >
                                  <Forward className="h-4 w-4 mr-2" />
                                  Forward
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                      
                      {/* Image Grid */}
                      <div className={cn("grid gap-1", getGridCols(displayImages.length))}>
                        {displayImages.map((imgMsg, imgIdx) => (
                          <div
                            key={imgMsg._id || imgMsg.messageId || imgIdx}
                            className={cn(
                              "relative overflow-hidden rounded-lg cursor-pointer hover:opacity-90",
                              displayImages.length === 1 ? "w-full" : "aspect-square",
                              // Special handling for 3 images: make last one span 2 columns
                              displayImages.length === 3 && imgIdx === 2 && "col-span-2"
                            )}
                            onClick={() => {
                              if (!selectMode) {
                                setSelectedImageUrl(imgMsg.mediaUrl || null);
                                setSelectedImageGroup(imageGroup);
                                setCurrentImageIndex(imageGroup.findIndex(m => (m._id || m.messageId) === (imgMsg._id || imgMsg.messageId)));
                              }
                            }}
                          >
                            {imgMsg.status === "sending" && (
                              <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-10">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                              </div>
                            )}
                            <img
                              src={imgMsg.mediaUrl}
                              alt={getMessageDisplayText(imgMsg) || "Image"}
                              className="w-full h-full object-cover"
                            />
                            {remainingCount > 0 && imgIdx === 3 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <span className="text-white text-lg font-semibold">
                                  +{remainingCount}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span
                          className={cn(
                            "text-xs",
                            groupDirection === "outgoing" ? "text-green-100" : "text-muted-foreground"
                          )}
                        >
                          {isMounted
                            ? new Date(imageGroup[0].timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"}
                        </span>
                      </div>
                    </div>
                    {/* Forward button */}
                    {!selectMode && onForwardMessages && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-center">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectMode(true);
                                  setSelectedMessageIds(new Set(imageGroup.map(msg => msg._id || msg.messageId)));
                                }}
                              >
                                <Forward className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                              <p>Forward</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Regular message rendering
            if (!("message" in item)) return null;
            
            const message = item.message;
            const date = "date" in item ? item.date : undefined;
            const isMediaType = ["image", "video", "audio", "document", "sticker"].includes(
              message.type
            );
            return (
              <div key={`${message._id || message.messageId}-${index}`}>
                {/* Date Separator */}
                {date ? (
                  <div className="flex justify-center my-4">
                    <div className="bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
                      {date}
                    </div>
                  </div>
                ) : null}
                {/* Message */}
                <div
                  className={cn(
                    "flex gap-2 items-start group",
                    message.direction === "outgoing" ? "justify-end" : "justify-start"
                  )}
                >
                {/* Checkbox in select mode */}
                {selectMode && (
                  <div className="flex items-start pt-3">
                    <Checkbox
                      checked={selectedMessageIds.has(message._id || message.messageId)}
                      onCheckedChange={() => handleMessageSelect(message._id || message.messageId)}
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3 relative group",
                    message.direction === "outgoing" ? "bg-green-800 text-white" : "bg-muted",
                    selectMode && selectedMessageIds.has(message._id || message.messageId) && "ring-2 ring-blue-500"
                  )}
                  onMouseDown={() => handleMouseDown(message._id || message.messageId)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Menu button at top right inside bubble */}
                  {!selectMode && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6",
                              message.direction === "outgoing"
                                ? "text-white hover:bg-white/20"
                                : "hover:bg-muted-foreground/10"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          {onReplyMessage && (
                            <DropdownMenuItem onClick={() => handleReply(message)}>
                              <Reply className="h-4 w-4 mr-2" />
                              Reply
                            </DropdownMenuItem>
                          )}
                          {onReactMessage && (
                            <>
                              <DropdownMenuItem onClick={() => handleReact(message, "👍")}>
                                <Smile className="h-4 w-4 mr-2" />
                                React 👍
                              </DropdownMenuItem>
                              <div className="px-2 py-1 flex gap-1">
                                {commonReactions.map((emoji) => (
                                  <Button
                                    key={emoji}
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReact(message, emoji);
                                    }}
                                  >
                                    {emoji}
                                  </Button>
                                ))}
                              </div>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          {onForwardMessages && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Enter select mode and pre-select this message
                                setSelectMode(true);
                                setSelectedMessageIds(new Set([message._id || message.messageId]));
                              }}
                            >
                              <Forward className="h-4 w-4 mr-2" />
                              Forward
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleCopy(message)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </DropdownMenuItem>
                          {message.mediaUrl && (
                            <DropdownMenuItem onClick={() => handleDownload(message)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {/* Forwarded indicator */}
                  {message.isForwarded && (
                    <div className="mb-1 text-xs opacity-70 flex items-center gap-1">
                      <Forward className="h-3 w-3" />
                      Forwarded
                    </div>
                  )}
                  {!message.mediaUrl &&
                    message.status === "sending" &&
                    (message.type === "image" ||
                      message.type === "video" ||
                      message.type === "audio" ||
                      message.type === "document") && (
                      <div className="mb-2 flex items-center justify-center p-4 bg-black/10 rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2 text-sm">Uploading...</span>
                      </div>
                    )}

                  {message.mediaUrl && (message.type === "image" || message.type === "sticker") && (
                    <div className="mb-2 relative group/media">
                      {message.status === "sending" && (
                        <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      <img
                        src={message.mediaUrl}
                        alt={getMessageDisplayText(message) || "Image"}
                        className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90"
                        onClick={() => {
                          if (!selectMode) {
                            setSelectedImageUrl(message.mediaUrl || null);
                            setSelectedImageGroup(null); // Single image, no group
                            setCurrentImageIndex(0);
                          }
                        }}
                      />
                    </div>
                  )}

                  {message.mediaUrl && message.type === "video" && (
                    <div className="mb-2 relative group/media">
                      {message.status === "sending" && (
                        <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-10">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      <video 
                        src={message.mediaUrl} 
                        controls 
                        className="max-w-full rounded-lg max-h-64 w-full object-contain bg-black/10"
                        preload="metadata"
                      />
                    </div>
                  )}

                  {message.mediaUrl && message.type === "audio" && (
                    <div className="mb-2 relative group/media">
                      {message.status === "sending" && (
                        <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-10">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        message.direction === "outgoing"
                          ? "bg-green-700/30 border-green-300"
                          : "bg-muted/50 border-gray-300"
                      )}>
                        <div className={cn(
                          "flex-shrink-0 p-2 rounded-full",
                          message.direction === "outgoing"
                            ? "bg-green-600"
                            : "bg-gray-200 dark:bg-gray-700"
                        )}>
                          <Music className={cn(
                            "h-5 w-5",
                            message.direction === "outgoing" ? "text-white" : "text-gray-700 dark:text-gray-200"
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {message.filename && (
                            <p className={cn(
                              "text-sm font-medium truncate mb-1",
                              message.direction === "outgoing" ? "text-green-50" : "text-foreground"
                            )}>
                              {message.filename}
                            </p>
                          )}
                          <audio 
                            src={message.mediaUrl} 
                            controls 
                            className="w-full h-8"
                            preload="metadata"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {message.mediaUrl && message.type === "document" && (
                    <div className="mb-2">
                      <div className={cn(
                        "flex items-center gap-2 p-2 rounded border",
                        message.direction === "outgoing"
                          ? "border-green-300 hover:bg-green-600"
                          : "border-gray-300 hover:bg-gray-100"
                      )}>
                        <FileText className="h-6 w-6" />
                        <a
                          href={message.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline flex-1"
                          onClick={(e) => !selectMode && e.stopPropagation()}
                        >
                          {message.filename || "Download Document"}
                        </a>
                      </div>
                    </div>
                  )}

                  {message.type === "location" &&
                    typeof message.content === "object" &&
                    message.content?.location && (
                      <div className="mb-2">
                        <a
                          href={`https://www.google.com/maps?q=${message.content.location.latitude},${message.content.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2 p-2 rounded border",
                            message.direction === "outgoing"
                              ? "border-green-300 hover:bg-green-600"
                              : "border-gray-300 hover:bg-gray-100"
                          )}
                        >
                          📍{" "}
                          {message.content.location.name ||
                            message.content.location.address ||
                            "View Location"}
                        </a>
                      </div>
                    )}

                  {(() => {
                    const displayText = getMessageDisplayText(message);
                    const hasCaption =
                      typeof message.content === "object" &&
                      message.content?.caption &&
                      message.content.caption !== message.content.caption?.split("/").pop();

                    if (!isMediaType || (isMediaType && hasCaption)) {
                      const textToShow =
                        isMediaType && typeof message.content === "object"
                          ? message.content.caption
                          : displayText;
                      if (
                        textToShow &&
                        !textToShow.startsWith("📷") &&
                        !textToShow.startsWith("🎬") &&
                        !textToShow.startsWith("🎵") &&
                        !textToShow.startsWith("📄") &&
                        !textToShow.startsWith("🎨")
                      ) {
                        return <p className="text-base break-words whitespace-pre-wrap">{textToShow}</p>;
                      }
                    }
                    if (isMediaType && message.mediaUrl) return null;
                    return <p className="text-base break-words whitespace-pre-wrap">{displayText}</p>;
                  })()}

                  {/* Reactions display */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className={cn(
                      "flex items-center gap-1 mt-1 mb-1",
                      message.direction === "outgoing" ? "justify-end" : "justify-start"
                    )}>
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                        message.direction === "outgoing" 
                          ? "bg-green-700/50" 
                          : "bg-muted"
                      )}>
                        {message.reactions.map((reaction, idx) => (
                          <span key={idx} className="text-sm">
                            {reaction.emoji}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1.5 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-xs",
                          message.direction === "outgoing" ? "text-green-100" : "text-muted-foreground"
                        )}
                      >
                        {isMounted
                          ? new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--:--"}
                      </span>
                      {message.direction === "outgoing" && (() => {
                        const info = statusInfo(message.status);
                        if (!info) return null;
                        return (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn("cursor-default flex items-center", info.color)}>
                                  {info.icon}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p>{info.label}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                {/* Forward button outside message bubble on the right - center justified */}
                {!selectMode && onForwardMessages && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-center">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              onForwardMessages([message._id || message.messageId]);
                            }}
                          >
                            <Forward className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          <p>Forward</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      </ScrollArea>
      
      {/* Floating Action Bar for Multi-Select */}
      {selectMode && selectedMessageIds.size > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-2 z-50">
          <span className="text-sm font-medium px-2">
            {selectedMessageIds.size} {selectedMessageIds.size === 1 ? "message" : "messages"} selected
          </span>
          <Button
            variant="default"
            size="sm"
            onClick={handleForward}
            className="bg-green-500 hover:bg-green-600"
          >
            <Forward className="h-4 w-4 mr-1" />
            Forward
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitSelectMode}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Lightbox Dialog */}
      <Dialog open={!!selectedImageUrl} onOpenChange={(open) => {
        if (!open) {
          setSelectedImageUrl(null);
          setSelectedImageGroup(null);
          setCurrentImageIndex(0);
        }
      }}>
        <DialogContent className="w-[90vw] h-[90vh] max-w-[90vw] max-h-[90vh] p-4 bg-black/95 border-0 flex flex-col">
          {selectedImageUrl && (() => {
            const currentMessage = selectedImageGroup 
              ? selectedImageGroup[currentImageIndex] 
              : messages.find(m => m.mediaUrl === selectedImageUrl);
            
            return (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Left Navigation Arrow - on container edge */}
                {selectedImageGroup && selectedImageGroup.length > 1 && currentImageIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 z-20 h-16 w-16 bg-black/70 hover:bg-black/90 text-white rounded-r-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevIndex = currentImageIndex - 1;
                      setCurrentImageIndex(prevIndex);
                      setSelectedImageUrl(selectedImageGroup[prevIndex].mediaUrl || null);
                    }}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                )}
                
                {/* Image Container - Fixed Size */}
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={selectedImageUrl}
                    alt="Full size image"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                
                {/* Right Navigation Arrow - on container edge */}
                {selectedImageGroup && selectedImageGroup.length > 1 && currentImageIndex < selectedImageGroup.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 z-20 h-16 w-16 bg-black/70 hover:bg-black/90 text-white rounded-l-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextIndex = currentImageIndex + 1;
                      setCurrentImageIndex(nextIndex);
                      setSelectedImageUrl(selectedImageGroup[nextIndex].mediaUrl || null);
                    }}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                )}
                
                {/* Action Buttons - Top Right */}
                {currentMessage && (
                  <div className="absolute top-4 right-4 z-20 flex gap-2">
                    {onForwardMessages && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="default"
                              size="icon"
                              className="h-10 w-10 bg-black/70 hover:bg-black/90 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                onForwardMessages([currentMessage._id || currentMessage.messageId]);
                              }}
                            >
                              <Forward className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Forward</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {onReactMessage && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="default"
                                  size="icon"
                                  className="h-10 w-10 bg-black/70 hover:bg-black/90 text-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Smile className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <div className="px-2 py-1 flex gap-1">
                                  {commonReactions.map((emoji) => (
                                    <Button
                                      key={emoji}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onReactMessage) {
                                          onReactMessage(currentMessage, emoji);
                                        }
                                      }}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TooltipTrigger>
                          <TooltipContent>React</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            size="icon"
                            className="h-10 w-10 bg-black/70 hover:bg-black/90 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(currentMessage);
                            }}
                          >
                            <Copy className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                
                {/* Image Counter - Bottom Center */}
                {selectedImageGroup && selectedImageGroup.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm z-20">
                    {currentImageIndex + 1} / {selectedImageGroup.length}
                  </div>
                )}
                
                {/* Close Button - Top Left */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4 z-20 h-10 w-10 bg-black/70 hover:bg-black/90 text-white"
                  onClick={() => {
                    setSelectedImageUrl(null);
                    setSelectedImageGroup(null);
                    setCurrentImageIndex(0);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

