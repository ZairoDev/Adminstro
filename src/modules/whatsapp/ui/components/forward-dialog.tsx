"use client";

import { useState, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Forward, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";

interface ForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForward: (conversationIds: string[]) => void;
  selectedMessageCount: number;
  conversations: Conversation[];
  loading?: boolean;
}

export const ForwardDialog = memo(function ForwardDialog({
  open,
  onOpenChange,
  onForward,
  selectedMessageCount,
  conversations,
  loading = false,
}: ForwardDialogProps) {
  const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
      <DialogContent className="sm:max-w-[450px] p-0 gap-0 bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-[#222d34] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
          <DialogTitle className="flex items-center gap-3 text-[#111b21] dark:text-[#e9edef]">
            <div className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center">
              <Forward className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[16px] font-medium">Forward message</p>
              <p className="text-[13px] font-normal text-[#667781] dark:text-[#8696a0]">
                {selectedMessageCount} {selectedMessageCount === 1 ? "message" : "messages"} selected
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#e9edef] dark:border-[#222d34]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f] dark:text-[#8696a0]" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[35px] pl-10 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-[14px] text-[#111b21] dark:text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="max-h-[350px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#25d366]" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[14px] text-[#667781] dark:text-[#8696a0]">
                No conversations found
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isSelected = selectedConversationIds.includes(conversation._id);
              return (
                <div
                  key={conversation._id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                    "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]",
                    isSelected && "bg-[#dcf8c6]/30 dark:bg-[#005c4b]/30"
                  )}
                  onClick={() => handleToggleConversation(conversation._id)}
                >
                  <Checkbox
                    checked={isSelected}
                    className={cn(
                      "border-[#8696a0]",
                      isSelected && "bg-[#25d366] border-[#25d366]"
                    )}
                    onCheckedChange={() => handleToggleConversation(conversation._id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.participantProfilePic} />
                    <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6b7b85] text-[#54656f] dark:text-white text-sm">
                      {conversation.participantName?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                      {conversation.participantName || conversation.participantPhone}
                    </p>
                    <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
                      {conversation.participantPhone}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222d34] flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 h-10 rounded-lg border-[#e9edef] dark:border-[#374045] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#374045]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedConversationIds.length === 0}
            className="flex-1 h-10 bg-[#25d366] hover:bg-[#1da851] text-white rounded-lg"
          >
            Forward ({selectedConversationIds.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});
