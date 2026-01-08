import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "../types";
import { getMessageDisplayText } from "../utils";
import { FileText } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Check, CheckCheck, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface MessageListProps {
  messages: Message[];
  messagesLoading: boolean;
  messageSearchQuery: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  selectedConversationActive: boolean;
  onLoadOlderMessages?: () => void;
  hasMoreMessages?: boolean;
  loadingOlderMessages?: boolean;
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
}: MessageListProps) {
  // Track if component is mounted (client-side only)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const filteredMessages = useMemo(
    () =>
      messages.filter((msg) => {
        if (!messageSearchQuery) return true;
        const displayText = getMessageDisplayText(msg);
        return displayText.toLowerCase().includes(messageSearchQuery.toLowerCase());
      }),
    [messages, messageSearchQuery]
  );

  // Group messages by date (only after mount to avoid hydration issues)
  const messagesWithDates = useMemo(() => {
    const grouped: Array<{ date?: string; message: Message }> = [];
    
    if (!isMounted) {
      // During SSR, don't show date separators to avoid hydration mismatch
      return filteredMessages.map((message) => ({ message } as { date?: string; message: Message }));
    }

    let lastDate: string | null = null;

    filteredMessages.forEach((message, index) => {
      const messageDate = new Date(message.timestamp);
      const shouldShowDate =
        index === 0 || !lastDate || !isSameDay(messageDate, new Date(filteredMessages[index - 1].timestamp));

      if (shouldShowDate) {
        lastDate = formatDateSeparator(messageDate);
        grouped.push({ date: lastDate, message });
      } else {
        grouped.push({ message });
      }
    });

    return grouped;
  }, [filteredMessages, isMounted]);

  return (
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
            const { date, message } = item;
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
                    "flex",
                    message.direction === "outgoing" ? "justify-end" : "justify-start"
                  )}
                >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg p-3",
                    message.direction === "outgoing" ? "bg-green-800 text-white" : "bg-muted"
                  )}
                >
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
                    <div className="mb-2 relative">
                      {message.status === "sending" && (
                        <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                      <img
                        src={message.mediaUrl}
                        alt={getMessageDisplayText(message) || "Image"}
                        className="max-w-full rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90"
                        onClick={() => window.open(message.mediaUrl, "_blank")}
                      />
                    </div>
                  )}

                  {message.mediaUrl && message.type === "video" && (
                    <div className="mb-2">
                      <video src={message.mediaUrl} controls className="max-w-full rounded-lg max-h-64" />
                    </div>
                  )}

                  {message.mediaUrl && message.type === "audio" && (
                    <div className="mb-2">
                      <audio src={message.mediaUrl} controls className="max-w-full" />
                    </div>
                  )}

                  {message.mediaUrl && message.type === "document" && (
                    <div className="mb-2">
                      <a
                        href={message.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center gap-2 p-2 rounded border",
                          message.direction === "outgoing"
                            ? "border-green-300 hover:bg-green-600"
                            : "border-gray-300 hover:bg-gray-100"
                        )}
                      >
                        <FileText className="h-6 w-6" />
                        <span className="text-sm underline">Download Document</span>
                      </a>
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

                  <div className="flex items-center justify-end gap-1.5 mt-1">
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
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

