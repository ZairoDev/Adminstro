import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsConditionsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const TermsConditionsModal = ({
  open,
  onClose,
  onAccept,
}: TermsConditionsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please read through our terms and conditions carefully
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4 text-sm text-foreground">
            <section>
              <h3 className="font-semibold text-base mb-2">
                1. Acceptance of Terms
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                By completing this onboarding process, you acknowledge that you
                have read, understood, and agree to be bound by these terms and
                conditions.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">
                2. Employment Agreement
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Your employment is subject to the position type, duration, and
                training period as specified in your selection details. This
                constitutes a binding agreement between you and the
                organization.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">
                3. Document Verification
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                All documents submitted during onboarding must be genuine and
                accurate. Any falsification or misrepresentation may result in
                immediate termination of employment.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">
                4. Confidentiality
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You agree to maintain confidentiality of all proprietary
                information, trade secrets, and sensitive data you may access
                during your employment.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">
                5. Code of Conduct
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You agree to adhere to the organization&apos;s code of conduct,
                policies, and procedures. Professional behavior and ethical
                conduct are expected at all times.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">
                6. Data Protection
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Your personal information will be processed in accordance with
                applicable data protection laws. We are committed to protecting
                your privacy and handling your data securely.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Amendments</h3>
              <p className="text-muted-foreground leading-relaxed">
                The organization reserves the right to modify these terms and
                conditions. You will be notified of any significant changes.
              </p>
            </section>
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onAccept} className="gradient-primary">
            Accept Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
