import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SignaturePreviewModalProps {
  open: boolean;
  signature: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SignaturePreviewModal = ({
  open,
  signature,
  onConfirm,
  onCancel,
}: SignaturePreviewModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Your Signature</DialogTitle>
          <DialogDescription>
            Please review your signature before confirming
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-6 bg-muted rounded-lg">
          <img
            src={signature || "/placeholder.svg"}
            alt="Signature preview"
            className="max-w-full max-h-40 object-contain"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Redraw
          </Button>
          <Button onClick={onConfirm} className="gradient-primary">
            Confirm Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

