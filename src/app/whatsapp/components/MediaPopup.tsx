"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Search,
  Filter,
  CheckSquare,
  Images,
  FileText,
  Link as LinkIcon,
  ChevronDown,
  Play,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import axios from "axios";

interface MediaPopupProps {
  open: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  phoneId?: string | null; // Phone number ID to filter media
}

type MediaTab = "media" | "docs" | "links";

interface MediaItem {
  id: string;
  conversationId: string;
  type: "image" | "video" | "document" | "audio";
  mediaUrl: string;
  mimeType?: string;
  filename?: string;
  timestamp: Date | string;
  sender: string;
  caption?: string;
}

export function MediaPopup({ open, onClose, conversation, phoneId }: MediaPopupProps) {
  const [activeTab, setActiveTab] = useState<MediaTab>("media");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch media when popup opens or tab changes
  useEffect(() => {
    if (!open) return;

    const fetchMedia = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (phoneId) {
          params.append("phoneId", phoneId);
        }
        if (conversation?._id) {
          params.append("conversationId", conversation._id);
        }
        
        // Determine media type based on active tab
        if (activeTab === "media") {
          params.append("type", "media"); // API will return both images and videos
        } else if (activeTab === "docs") {
          params.append("type", "document");
        } else if (activeTab === "links") {
          // Links would need special handling - for now return empty
          setMedia([]);
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/whatsapp/conversations/media?${params.toString()}`);
        if (response.data.success) {
          setMedia(response.data.media || []);
        }
      } catch (error) {
        console.error("Error fetching media:", error);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [open, activeTab, phoneId, conversation?._id]);

  if (!open) return null;

  const displayName = conversation
    ? conversation.participantName ||
      (conversation as any).whatsappName ||
      conversation.participantPhone
    : "Media";

  const subtitleText = conversation
    ? activeTab === "media"
      ? `Media from ${displayName}`
      : activeTab === "docs"
      ? `Docs from ${displayName}`
      : `Links from ${displayName}`
    : activeTab === "media"
    ? "Media from all chats"
    : activeTab === "docs"
    ? "Docs from all chats"
    : "Links from all chats";

  // Format date for grouping (e.g., "Last week", "26 January - 1 February 2026")
  const formatDateGroup = (date: Date | string): string => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return "Last week";
    } else if (diffDays < 14) {
      return "2 weeks ago";
    } else {
      // Format as date range for the week
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      return `${weekStart.getDate()} ${weekStart.toLocaleDateString("en-US", { month: "long" })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("en-US", { month: "long" })} ${weekEnd.getFullYear()}`;
    }
  };

  // Filter media by search query
  const filteredMedia = media.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.sender.toLowerCase().includes(query) ||
      item.caption?.toLowerCase().includes(query) ||
      item.filename?.toLowerCase().includes(query)
    );
  });

  // Group media by date
  const groupedMedia = filteredMedia.reduce((acc, item) => {
    const group = formatDateGroup(item.timestamp);
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 p-4">
      <div className="h-full max-h-[90vh] w-full max-w-4xl bg-[#111b21] dark:bg-[#0b141a] flex flex-col shadow-2xl rounded-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Header - Everything in one horizontal line */}
        <div className="flex-shrink-0 border-b border-[#222d34] dark:border-[#222d34] bg-[#202c33] dark:bg-[#202c33]">
          <div className="flex items-center justify-between px-6 py-4 gap-4">
            {/* Left: Title and Subtitle */}
            <div className="flex flex-col min-w-0">
              <h2 className="text-[20px] font-semibold text-[#e9edef] leading-tight">
                {activeTab === "media" ? "Media" : activeTab === "docs" ? "Docs" : "Links"}
              </h2>
              <p className="text-[12px] text-[#8696a0] leading-tight whitespace-nowrap">{subtitleText}</p>
            </div>

            {/* Center: Tabs */}
            <div className="flex items-center gap-6 flex-1 justify-center">
              <button
                onClick={() => setActiveTab("media")}
                className={cn(
                  "flex items-center gap-1 pb-1 px-1 text-[14px] font-medium transition-colors relative",
                  activeTab === "media"
                    ? "text-[#e9edef]"
                    : "text-[#8696a0] hover:text-[#e9edef]"
                )}
              >
                Media
                {activeTab === "media" && (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e9edef]" />
                  </>
                )}
              </button>
              <button
                onClick={() => setActiveTab("docs")}
                className={cn(
                  "pb-1 px-1 text-[14px] font-medium transition-colors relative",
                  activeTab === "docs"
                    ? "text-[#e9edef]"
                    : "text-[#8696a0] hover:text-[#e9edef]"
                )}
              >
                Docs
                {activeTab === "docs" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e9edef]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("links")}
                className={cn(
                  "pb-1 px-1 text-[14px] font-medium transition-colors relative",
                  activeTab === "links"
                    ? "text-[#e9edef]"
                    : "text-[#8696a0] hover:text-[#e9edef]"
                )}
              >
                Links
                {activeTab === "links" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e9edef]" />
                )}
              </button>
            </div>

            {/* Right: Action Icons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {showSearch ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8696a0]" />
                    <Input
                      autoFocus
                      placeholder="Search media..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 pl-10 bg-[#111b21] border border-[#222d34] rounded-lg text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0 h-9"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="h-9 w-9 text-[#8696a0] hover:bg-[#111b21]"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSearch(true)}
                    className="h-9 w-9 text-[#8696a0] hover:bg-[#111b21] rounded-full"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[#8696a0] hover:bg-[#111b21] rounded-full"
                  >
                    <Filter className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-[#8696a0] hover:bg-[#111b21] rounded-full"
                  >
                    <CheckSquare className="h-5 w-5" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9 text-[#8696a0] hover:bg-[#111b21] rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area - Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[#8696a0]" />
            </div>
          ) : activeTab === "media" ? (
            <div className="space-y-6">
              {Object.keys(groupedMedia).length > 0 ? (
                Object.entries(groupedMedia).map(([date, items]) => (
                  <div key={date}>
                    <h4 className="text-[13px] font-medium text-[#8696a0] mb-3">
                      {date}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="relative aspect-square rounded-lg overflow-hidden bg-[#202c33] cursor-pointer hover:opacity-90 transition-opacity group"
                        >
                          {item.type === "image" ? (
                            <>
                              <img
                                src={item.mediaUrl}
                                alt={item.caption || "Image"}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Show placeholder on error
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                  const placeholder = target.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = "flex";
                                }}
                              />
                              <div className="hidden w-full h-full bg-gradient-to-br from-[#202c33] to-[#2a3942] items-center justify-center absolute inset-0">
                                <Images className="h-8 w-8 text-[#8696a0]" />
                              </div>
                            </>
                          ) : item.type === "video" ? (
                            <div className="w-full h-full bg-gradient-to-br from-[#202c33] to-[#2a3942] flex items-center justify-center relative">
                              <video
                                src={item.mediaUrl}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  const target = e.target as HTMLVideoElement;
                                  target.style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Play className="h-8 w-8 text-white/80" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#202c33] to-[#2a3942] flex items-center justify-center">
                              <FileText className="h-8 w-8 text-[#8696a0]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Images className="h-16 w-16 text-[#8696a0] mb-4" />
                  <p className="text-[#8696a0] text-[15px]">No media found</p>
                </div>
              )}
            </div>
          ) : activeTab === "docs" ? (
            <div className="space-y-6">
              {Object.keys(groupedMedia).length > 0 ? (
                Object.entries(groupedMedia).map(([date, items]) => (
                  <div key={date}>
                    <h4 className="text-[13px] font-medium text-[#8696a0] mb-3">
                      {date}
                    </h4>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#202c33] hover:bg-[#2a3942] cursor-pointer transition-colors"
                        >
                          <FileText className="h-8 w-8 text-[#8696a0] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] text-[#e9edef] truncate">
                              {item.filename || "Document"}
                            </p>
                            <p className="text-[12px] text-[#8696a0] truncate">
                              {item.sender}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <FileText className="h-16 w-16 text-[#8696a0] mb-4" />
                  <p className="text-[#8696a0] text-[15px]">No documents found</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <LinkIcon className="h-16 w-16 text-[#8696a0] mb-4" />
              <p className="text-[#8696a0] text-[15px]">No links found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
