import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutTemplate, AlertTriangle, Clock } from "lucide-react";

interface WindowWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onSendTemplate: () => void;
}

export const WindowWarningDialog = memo(function WindowWarningDialog({
  open,
  onClose,
  onSendTemplate,
}: WindowWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-[#222d34] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-[#fdf4e3] dark:bg-[#3b2c13] border-b border-[#e9c96c] dark:border-[#5c4516]">
          <DialogTitle className="flex items-center gap-3 text-[#b7892b]">
            <div className="w-10 h-10 rounded-full bg-[#f0c14b]/20 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[16px] font-medium">Messaging Window Expired</p>
              <p className="text-[13px] font-normal text-[#8a6921]">
                24-hour limit reached
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <DialogDescription className="text-[14px] text-[#667781] dark:text-[#8696a0] leading-relaxed">
            WhatsApp requires businesses to respond within 24 hours of the customer&apos;s last message.
            Since the window has expired, you can only send pre-approved template messages.
          </DialogDescription>

          <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-lg">
            <h4 className="font-medium text-[14px] text-[#111b21] dark:text-[#e9edef] mb-3">
              What you can do:
            </h4>
            <ul className="text-[13px] text-[#667781] dark:text-[#8696a0] space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-[#25d366] mt-0.5">•</span>
                Send a template message to re-engage the customer
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#25d366] mt-0.5">•</span>
                Wait for the customer to message you first
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#25d366] mt-0.5">•</span>
                The 24-hour window resets when they reply
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border-[#e9edef] dark:border-[#374045] text-[#54656f] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#374045]"
            >
              Cancel
            </Button>
            <Button
              onClick={onSendTemplate}
              className="flex-1 h-11 bg-[#25d366] hover:bg-[#1da851] text-white rounded-lg"
            >
              <LayoutTemplate className="h-4 w-4 mr-2" />
              Send Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
