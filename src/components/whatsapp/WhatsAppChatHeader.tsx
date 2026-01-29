"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/AuthStore";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Phone, Video, MoreVertical, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppPhoneConfig {
  phoneNumberId: string;
  displayNumber: string;
  displayName: string;
  area: string;
  businessAccountId: string;
}

interface Conversation {
  _id: string;
  participantPhone: string;
  participantName: string;
  participantProfilePic?: string;
  businessPhoneId: string;
  status: string;
}

interface WhatsAppChatHeaderProps {
  conversation: Conversation | null;
  allowedPhoneConfigs: WhatsAppPhoneConfig[];
  selectedPhoneId: string;
  onPhoneIdChange: (phoneId: string) => void;
  onSearchClick?: () => void;
  onMoreClick?: () => void;
}

/**
 * WhatsApp Chat Header Component
 * 
 * Displays:
 * - Contact info (avatar, name, phone)
 * - Phone number selector (only if user has access to multiple numbers)
 * - Call buttons (audio/video) with permission checks
 * - Search and more options
 */
export default function WhatsAppChatHeader({
  conversation,
  allowedPhoneConfigs,
  selectedPhoneId,
  onPhoneIdChange,
  onSearchClick,
  onMoreClick,
}: WhatsAppChatHeaderProps) {
  const { token } = useAuthStore();
  const { toast } = useToast();
  const [callPermissions, setCallPermissions] = useState<{
    canMakeCalls: boolean;
    canMakeVideoCalls: boolean;
  }>({ canMakeCalls: false, canMakeVideoCalls: false });
  const [callingAudio, setCallingAudio] = useState(false);
  const [callingVideo, setCallingVideo] = useState(false);

  // Check call permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const response = await axios.get("/api/whatsapp/call");
        if (response.data.success) {
          setCallPermissions({
            canMakeCalls: response.data.canMakeCalls,
            canMakeVideoCalls: response.data.canMakeVideoCalls,
          });
        }
      } catch (error) {
        console.error("Failed to check call permissions:", error);
      }
    };
    checkPermissions();
  }, []);

  // Get current phone config
  const currentPhoneConfig = allowedPhoneConfigs.find(
    (config) => config.phoneNumberId === selectedPhoneId
  );

  // Handle audio call
  const handleAudioCall = async () => {
    if (!conversation || !callPermissions.canMakeCalls) return;

    setCallingAudio(true);
    try {
      const response = await axios.post("/api/whatsapp/call", {
        conversationId: conversation._id,
        phoneNumberId: selectedPhoneId,
        callType: "audio",
        action: "request",
      });

      if (response.data.success) {
        toast({
          title: "Call Request Sent",
          description: response.data.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Call Failed",
        description: error.response?.data?.error || "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setCallingAudio(false);
    }
  };

  // Handle video call
  const handleVideoCall = async () => {
    if (!conversation || !callPermissions.canMakeVideoCalls) return;

    setCallingVideo(true);
    try {
      const response = await axios.post("/api/whatsapp/call", {
        conversationId: conversation._id,
        phoneNumberId: selectedPhoneId,
        callType: "video",
        action: "request",
      });

      if (response.data.success) {
        toast({
          title: "Video Call Request Sent",
          description: response.data.message,
        });
      }
    } catch (error: any) {
      toast({
        title: "Video Call Failed",
        description: error.response?.data?.error || "Failed to initiate video call",
        variant: "destructive",
      });
    } finally {
      setCallingVideo(false);
    }
  };

  if (!conversation) {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      {/* Left: Contact Info */}
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.participantProfilePic} />
          <AvatarFallback className="bg-green-100 text-green-700">
            {(conversation.participantName || conversation.participantPhone)
              ?.slice(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-sm">
            {conversation.participantName || conversation.participantPhone}
          </h3>
          <p className="text-xs text-muted-foreground">
            {conversation.participantPhone}
          </p>
        </div>
      </div>

      {/* Current phone display (read-only, no selector) */}
      {currentPhoneConfig && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {currentPhoneConfig.displayName}
          </span>
          <Badge variant="outline" className="text-[10px] capitalize">
            {currentPhoneConfig.area}
          </Badge>
        </div>
      )}

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Audio Call Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAudioCall}
                disabled={!callPermissions.canMakeCalls || callingAudio}
                className={!callPermissions.canMakeCalls ? "opacity-50" : ""}
              >
                {callingAudio ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {callPermissions.canMakeCalls
                ? "Send call request"
                : "Call not available for your role"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Video Call Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleVideoCall}
                disabled={!callPermissions.canMakeVideoCalls || callingVideo}
                className={!callPermissions.canMakeVideoCalls ? "opacity-50" : ""}
              >
                {callingVideo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Video className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {callPermissions.canMakeVideoCalls
                ? "Send video call request"
                : "Video call not available for your role"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Search Button */}
        <Button variant="ghost" size="icon" onClick={onSearchClick}>
          <Search className="h-4 w-4" />
        </Button>

        {/* More Options */}
        <Button variant="ghost" size="icon" onClick={onMoreClick}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
