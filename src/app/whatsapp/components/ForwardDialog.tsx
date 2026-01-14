"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import axios from "axios";

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForward: (conversationIds: string[]) => void;
  selectedMessageCount: number;
  conversations: Conversation[];
  loading?: boolean;
}

export function ForwardDialog({
  open,
  onOpenChange,
  onForward,
  selectedMessageCount,
  conversations,
  loading = false,
}: ForwardDialogProps) {
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter conversations by search
  const filteredConversations = conversations.filter((conv) =>
    conv.participantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participantPhone.includes(searchQuery)
  );

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversationIds((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForward = () => {
    if (selectedConversationIds.length > 0) {
      onForward(selectedConversationIds);
      setSelectedConversationIds([]);
      setSearchQuery("");
    }
  };

  const handleCancel = () => {
    setSelectedConversationIds([]);
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Forward {selectedMessageCount} {selectedMessageCount === 1 ? "message" : "messages"}</DialogTitle>
          <DialogDescription>
            Select one or more conversations to forward to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Conversation List */}
          <ScrollArea className="h-[300px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 text-sm">
                No conversations found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const isSelected = selectedConversationIds.includes(conversation._id);
                  return (
                    <div
                      key={conversation._id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        isSelected && "bg-muted"
                      )}
                      onClick={() => handleToggleConversation(conversation._id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleConversation(conversation._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar>
                        <AvatarImage src={conversation.participantProfilePic} />
                        <AvatarFallback className="bg-green-100 text-green-700">
                          {conversation.participantName?.slice(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.participantName || conversation.participantPhone}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.participantPhone}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedConversationIds.length === 0}
            className="bg-green-500 hover:bg-green-600"
          >
            Forward to {selectedConversationIds.length} {selectedConversationIds.length === 1 ? "conversation" : "conversations"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
