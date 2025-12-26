import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayoutTemplate, AlertTriangle } from "lucide-react";

interface WindowWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onSendTemplate: () => void;
}

export function WindowWarningDialog({ open, onClose, onSendTemplate }: WindowWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <AlertTriangle className="h-5 w-5" />
            24-Hour Messaging Window Expired
          </DialogTitle>
          <DialogDescription className="pt-2">
            WhatsApp requires businesses to respond within 24 hours of the customer&apos;s last message.
            Since the window has expired, you can only send pre-approved template messages.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted p-4 rounded-lg mt-2">
          <h4 className="font-medium text-sm mb-2">What can you do?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Send a template message to re-engage the customer</li>
            <li>• Wait for the customer to message you first</li>
            <li>• The window resets when they reply</li>
          </ul>
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSendTemplate} className="bg-green-500 hover:bg-green-600">
            <LayoutTemplate className="h-4 w-4 mr-2" />
            Send Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

