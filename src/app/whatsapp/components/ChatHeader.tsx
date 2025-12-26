import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Archive,
  BellOff,
  Loader2,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Video,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation } from "../types";
import { getRemainingHours } from "../utils";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: Conversation;
  callPermissions: { canMakeCalls: boolean; canMakeVideoCalls: boolean };
  callingAudio: boolean;
  callingVideo: boolean;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onRefreshTemplates: () => void;
  templatesLoading: boolean;
  showMessageSearch: boolean;
  onToggleMessageSearch: () => void;
  onCloseSearch: () => void;
  messageSearchQuery: string;
  onMessageSearchChange: (value: string) => void;
  onMute: () => void;
  onArchive: () => void;
  toastCopy: () => void;
  onDelete: () => void;
}

export function ChatHeader({
  conversation,
  callPermissions,
  callingAudio,
  callingVideo,
  onAudioCall,
  onVideoCall,
  onRefreshTemplates,
  templatesLoading,
  showMessageSearch,
  onToggleMessageSearch,
  onCloseSearch,
  messageSearchQuery,
  onMessageSearchChange,
  onMute,
  onArchive,
  toastCopy,
  onDelete,
}: ChatHeaderProps) {
  const remaining = useMemo(() => getRemainingHours(conversation), [conversation]);

  return (
    <CardHeader className="pb-2 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={conversation.participantProfilePic} />
            <AvatarFallback className="bg-green-100 text-green-700">
              {(conversation.participantName || conversation.participantPhone)?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">
              {conversation.participantName || conversation.participantPhone}
            </CardTitle>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{conversation.participantPhone}</p>
              {remaining ? (
                <Badge
                  variant="outline"
                  className={cn("text-xs gap-1", remaining.hours < 2 ? "border-orange-500 text-orange-500" : "border-green-500 text-green-500")}
                >
                  <Timer className="h-3 w-3" />
                  {remaining.hours}h {remaining.minutes}m
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 border-red-500 text-red-500">
                  <AlertTriangle className="h-3 w-3" />
                  Template only
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {callPermissions.canMakeCalls && (
            <Button variant="ghost" size="icon" onClick={onAudioCall} disabled={callingAudio} title="Voice Call">
              {callingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            </Button>
          )}

          {callPermissions.canMakeVideoCalls && (
            <Button variant="ghost" size="icon" onClick={onVideoCall} disabled={callingVideo} title="Video Call">
              {callingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={onRefreshTemplates} title="Refresh Templates">
            <RefreshCw className={cn("h-4 w-4", templatesLoading && "animate-spin")} />
          </Button>

          <Button variant="ghost" size="icon" onClick={onToggleMessageSearch} title="Search Messages">
            <Search className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={toastCopy}>
                <Phone className="h-4 w-4 mr-2" />
                Copy Phone Number
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMute}>
                <BellOff className="h-4 w-4 mr-2" />
                Mute Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showMessageSearch && (
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Search in conversation..."
            value={messageSearchQuery}
            onChange={(e) => onMessageSearchChange(e.target.value)}
            className="h-8 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCloseSearch}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </CardHeader>
  );
}

