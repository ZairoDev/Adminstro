import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, UserPlus, Link2 } from "lucide-react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddGuestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestAdded: (conversationId: string, conversation?: any) => void;
  defaultPhoneNumberId?: string;
}

export const AddGuestModal = memo(function AddGuestModal({
  open,
  onOpenChange,
  onGuestAdded,
  defaultPhoneNumberId,
}: AddGuestModalProps) {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    phone?: string;
    referenceLink?: string;
  }>({});

  const validatePhone = (phone: string, code: string): boolean => {
    if (!code.trim() || !phone.trim()) {
      setErrors((prev) => ({ ...prev, phone: "Country code and phone number are required" }));
      return false;
    }

    const normalized = (code + phone).replace(/\D/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(normalized)) {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone number must be in E.164 format (7-15 digits, no leading zero)",
      }));
      return false;
    }

    setErrors((prev => {
      const newErrors = { ...prev };
      delete newErrors.phone;
      return newErrors;
    }));
    return true;
  };

  const validateReferenceLink = (link: string): boolean => {
    if (!link.trim()) {
      setErrors((prev => {
        const newErrors = { ...prev };
        delete newErrors.referenceLink;
        return newErrors;
      }));
      return true;
    }

    try {
      new URL(link);
      setErrors((prev => {
        const newErrors = { ...prev };
        delete newErrors.referenceLink;
        return newErrors;
      }));
      return true;
    } catch {
      setErrors((prev) => ({
        ...prev,
        referenceLink: "Please enter a valid URL (e.g., https://example.com)",
      }));
      return false;
    }
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!validatePhone(phoneNumber, countryCode)) {
      return;
    }

    if (referenceLink.trim() && !validateReferenceLink(referenceLink)) {
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = (countryCode + phoneNumber).replace(/\D/g, "");

      const response = await axios.post("/api/whatsapp/conversations", {
        participantPhone: normalizedPhone,
        participantName: ownerName.trim() || undefined,
        phoneNumberId: defaultPhoneNumberId,
        referenceLink: referenceLink.trim() || undefined,
        conversationType: "owner",
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Owner conversation created successfully",
        });

        setPhoneNumber("");
        setCountryCode("");
        setOwnerName("");
        setReferenceLink("");
        setErrors({});
        onOpenChange(false);

        // Pass both the ID and the full conversation object
        if (response.data.conversation?._id) {
          onGuestAdded(response.data.conversation._id, response.data.conversation);
        }
      }
    } catch (error: any) {
      console.error("Error creating owner conversation:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create owner conversation";
      
      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        try {
          const normalizedPhone = (countryCode + phoneNumber).replace(/\D/g, "");
          const conversationsResponse = await axios.get("/api/whatsapp/conversations");
          if (conversationsResponse.data.success) {
            const existingConv = conversationsResponse.data.conversations.find(
              (c: any) => c.participantPhone === normalizedPhone
            );
            if (existingConv) {
              toast({
                title: "Conversation exists",
                description: "Opening existing conversation",
              });
              onOpenChange(false);
              onGuestAdded(existingConv._id, existingConv);
              return;
            }
          }
        } catch (e) {
          // Fall through to error toast
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setPhoneNumber("");
      setCountryCode("");
      setOwnerName("");
      setReferenceLink("");
      setErrors({});
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px] p-0 gap-0 bg-white dark:bg-[#111b21] border-[#e9edef] dark:border-[#222d34] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34]">
          <DialogTitle className="flex items-center gap-3 text-[#111b21] dark:text-[#e9edef]">
            <div className="w-10 h-10 rounded-full bg-[#25d366] flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[16px] font-medium">Add New Owner</p>
              <p className="text-[13px] font-normal text-[#667781] dark:text-[#8696a0]">
                Create owner conversation with details
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-[#54656f] dark:text-[#8696a0]">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative w-20">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667781] dark:text-[#8696a0] text-sm">
                  +
                </span>
                <Input
                  placeholder="91"
                  value={countryCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setCountryCode(value);
                    if (value && phoneNumber) {
                      validatePhone(phoneNumber, value);
                    }
                  }}
                  className="h-10 pl-6 bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045] rounded-lg"
                  maxLength={4}
                  disabled={loading}
                />
              </div>
              <Input
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setPhoneNumber(value);
                  if (countryCode && value) {
                    validatePhone(value, countryCode);
                  }
                }}
                className="flex-1 h-10 bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045] rounded-lg"
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{errors.phone}</p>
              </div>
            )}
          </div>

          {/* Owner Name */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-[#54656f] dark:text-[#8696a0]">
              Owner Name
              <span className="text-[11px] font-normal ml-1">(optional)</span>
            </Label>
            <Input
              placeholder="John Doe"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-10 bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045] rounded-lg"
              disabled={loading}
            />
          </div>

          {/* Reference Link */}
          <div className="space-y-2">
            <Label className="text-[13px] font-medium text-[#54656f] dark:text-[#8696a0] flex items-center gap-1">
              <Link2 className="h-3.5 w-3.5" />
              Reference Link
              <span className="text-[11px] font-normal ml-1">(optional)</span>
            </Label>
            <Input
              placeholder="https://example.com/property/123"
              type="url"
              value={referenceLink}
              onChange={(e) => {
                setReferenceLink(e.target.value);
                if (e.target.value.trim()) {
                  validateReferenceLink(e.target.value);
                } else {
                  setErrors((prev => {
                    const newErrors = { ...prev };
                    delete newErrors.referenceLink;
                    return newErrors;
                  }));
                }
              }}
              className="h-10 bg-white dark:bg-[#2a3942] border-[#e9edef] dark:border-[#374045] rounded-lg"
              disabled={loading}
            />
            {errors.referenceLink && (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-[12px] text-red-600 dark:text-red-400">{errors.referenceLink}</p>
              </div>
            )}
            <p className="text-[11px] text-[#667781] dark:text-[#8696a0]">
              Property listing URL or any reference link
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 h-10 rounded-lg border-[#e9edef] dark:border-[#374045] text-[#54656f] dark:text-[#8696a0] hover:bg-[#f0f2f5] dark:hover:bg-[#374045]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !countryCode.trim() || !phoneNumber.trim()}
              className="flex-1 h-10 bg-[#25d366] hover:bg-[#1da851] text-white rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Owner"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
