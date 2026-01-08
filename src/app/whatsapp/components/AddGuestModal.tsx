import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";

interface AddGuestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGuestAdded: (conversationId: string) => void;
  defaultPhoneNumberId?: string;
}

export function AddGuestModal({
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
      // Reference link is optional, so empty is valid
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
    // Clear previous errors
    setErrors({});

    // Validate phone number
    if (!validatePhone(phoneNumber, countryCode)) {
      return;
    }

    // Validate reference link if provided
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

        // Reset form
        setPhoneNumber("");
        setCountryCode("");
        setOwnerName("");
        setReferenceLink("");
        setErrors({});
        onOpenChange(false);

        // Notify parent to navigate to the conversation
        if (response.data.conversation?._id) {
          onGuestAdded(response.data.conversation._id);
        }
      }
    } catch (error: any) {
      console.error("Error creating owner conversation:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create owner conversation";
      
      if (errorMessage.includes("already exists") || errorMessage.includes("duplicate")) {
        // Conversation already exists, try to get it
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
              onGuestAdded(existingConv._id);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Owner</DialogTitle>
          <DialogDescription>
            Create a new owner conversation. Enter the phone number with country code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="countryCode">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  +
                </span>
                <Input
                  id="countryCode"
                  placeholder="91"
                  value={countryCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setCountryCode(value);
                    if (value && phoneNumber) {
                      validatePhone(phoneNumber, value);
                    }
                  }}
                  className="pl-6"
                  maxLength={4}
                  disabled={loading}
                />
              </div>
              <Input
                id="phoneNumber"
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setPhoneNumber(value);
                  if (countryCode && value) {
                    validatePhone(value, countryCode);
                  }
                }}
                className="flex-1"
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errors.phone}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Owner Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="ownerName">Owner Name (Optional)</Label>
            <Input
              id="ownerName"
              placeholder="John Doe"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Reference Link (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="referenceLink">Reference Link (Optional)</Label>
            <Input
              id="referenceLink"
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
              disabled={loading}
            />
            {errors.referenceLink && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errors.referenceLink}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Property listing URL or any reference link
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !countryCode.trim() || !phoneNumber.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Owner"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

