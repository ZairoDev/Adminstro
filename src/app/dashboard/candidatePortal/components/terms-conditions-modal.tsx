"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

interface TermsConditionsModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsConditionsModal({
  open,
  onClose,
  onAccept,
}: TermsConditionsModalProps) {
  const [expanded, setExpanded] = useState(false);

  if (!open) return null;

  const termsContent = `
    TERMS AND CONDITIONS

    1. EMPLOYMENT AGREEMENT
    This employment agreement outlines the terms and conditions of your employment with our organization.

    2. CONFIDENTIALITY AGREEMENT
    You agree to maintain strict confidentiality regarding all company proprietary information, trade secrets, 
    and confidential business information that you access or become aware of during your employment.

    3. INTELLECTUAL PROPERTY
    All work product, inventions, and intellectual property created during your employment shall be the 
    exclusive property of the company.

    4. CODE OF CONDUCT
    You agree to adhere to our company&apos;s code of conduct and workplace policies as outlined in the employee handbook.

    5. NON-DISCLOSURE
    You will not disclose any confidential information to third parties without explicit written authorization 
    from the company.

    6. DATA PRIVACY
    Your personal data will be processed in accordance with applicable data protection laws and regulations. 
    The company is committed to protecting your privacy.

    7. WORK HOURS
    Your work schedule will be as agreed upon with your manager. You are expected to maintain professional 
    conduct during work hours.

    8. COMPENSATION AND BENEFITS
    Your compensation package will be as per the offer letter issued to you. Benefits are subject to company 
    policies and applicable laws.

    9. TERMINATION
    Either party may terminate the employment relationship in accordance with applicable labor laws and 
    company policies.

    10. DISPUTE RESOLUTION
    Any disputes arising out of this agreement shall be resolved through mutual discussion or legal arbitration 
    as per applicable jurisdiction.

    11. GOVERNING LAW
    This agreement shall be governed by and construed in accordance with the laws of the jurisdiction where 
    the company is registered.

    12. ACCEPTANCE
    By accepting these terms and conditions, you acknowledge that you have read, understood, and agree to be 
    bound by all the provisions herein.
  `;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            Terms and Conditions
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {termsContent}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-transparent"
          >
            Close
          </Button>
          <Button onClick={onAccept} className="flex-1">
            Accept & Continue
          </Button>
        </div>
      </Card>
    </div>
  );
}
