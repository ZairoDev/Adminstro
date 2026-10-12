"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "../types";
import type { WhatsAppPhoneConfig } from "@/lib/whatsapp/config";
import { formatPhoneDisplayWithLocation } from "@/lib/whatsapp/config";

interface LeadTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  currentPhoneId: string | null;
  availablePhoneConfigs: WhatsAppPhoneConfig[];
  onTransfer: (targetPhoneId: string) => Promise<void>;
  loading?: boolean;
}

export function LeadTransferDialog({
  open,
  onOpenChange,
  conversation,
  currentPhoneId,
  availablePhoneConfigs,
  onTransfer,
  loading = false,
}: LeadTransferDialogProps) {
  const [selectedPhoneId, setSelectedPhoneId] = useState<string | null>(null);

  // Filter out current phone and internal phones
  const transferablePhones = availablePhoneConfigs.filter(
    (config) =>
      config.phoneNumberId !== currentPhoneId && !config.isInternal
  );

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedPhoneId(null);
    }
  }, [open]);

  const handleTransfer = async () => {
    if (!selectedPhoneId) return;
    await onTransfer(selectedPhoneId);
    onOpenChange(false);
  };

  if (!conversation) return null;

  const displayName =
    conversation.participantName ||
    (conversation as any).whatsappName ||
    conversation.participantPhone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-[#25d366]" />
            Transfer Lead
          </DialogTitle>
          <DialogDescription>
            Transfer conversation with <strong>{displayName}</strong> to another location.
            All messages will be moved with the conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {transferablePhones.length === 0 ? (
            <div className="text-center py-8 text-[#667781] dark:text-[#8696a0]">
              <p>No other locations available for transfer.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef] mb-3">
                Select target location:
              </p>
              {transferablePhones.map((config) => (
                <button
                  key={config.phoneNumberId}
                  onClick={() => setSelectedPhoneId(config.phoneNumberId)}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border-2 transition-colors",
                    selectedPhoneId === config.phoneNumberId
                      ? "border-[#25d366] bg-[#d9fdd3] dark:bg-[#005c4b]/20"
                      : "border-[#e9edef] dark:border-[#222d34] hover:border-[#25d366]/50 hover:bg-[#f0f2f5] dark:hover:bg-[#202c33]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#111b21] dark:text-[#e9edef]">
                        {formatPhoneDisplayWithLocation(config)}
                      </p>
                      {Array.isArray(config.area) ? (
                        <p className="text-sm text-[#667781] dark:text-[#8696a0] mt-1">
                          {config.area
                            .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
                            .join(", ")}
                        </p>
                      ) : (
                        <p className="text-sm text-[#667781] dark:text-[#8696a0] mt-1">
                          {config.area.charAt(0).toUpperCase() + config.area.slice(1)}
                        </p>
                      )}
                    </div>
                    {selectedPhoneId === config.phoneNumberId && (
                      <div className="h-5 w-5 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#e9edef] dark:border-[#222d34]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedPhoneId || loading}
            className="bg-[#25d366] hover:bg-[#1da851] text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
