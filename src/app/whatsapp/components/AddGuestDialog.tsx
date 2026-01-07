import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";

interface AddGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { countryCode: string; phone: string; name?: string; referenceLink?: string }) => Promise<void>;
}

export function AddGuestDialog({ open, onOpenChange, onSubmit }: AddGuestDialogProps) {
  const [countryCode, setCountryCode] = useState("91");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [countryError, setCountryError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const resetState = () => {
    setCountryCode("91");
    setPhone("");
    setName("");
    setReferenceLink("");
    setCountryError(null);
    setPhoneError(null);
    setLinkError(null);
    setFormError(null);
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      if (!submitting) {
        resetState();
      }
      onOpenChange(value);
    }
  };

  const validate = (): boolean => {
    let valid = true;
    setCountryError(null);
    setPhoneError(null);
    setLinkError(null);
    setFormError(null);

    const cc = countryCode.trim();
    if (!cc) {
      setCountryError("Country code is required.");
      valid = false;
    } else if (!/^\d{1,4}$/.test(cc)) {
      setCountryError("Country code must be 1–4 digits.");
      valid = false;
    }

    const p = phone.trim();
    if (!p) {
      setPhoneError("Phone number is required.");
      valid = false;
    } else if (!/^\d{5,12}$/.test(p)) {
      setPhoneError("Enter a valid local number (5–12 digits).");
      valid = false;
    }

    // Validate full E.164 form
    if (valid) {
      const full = `+${cc}${p}`;
      if (!/^\+[1-9][0-9]{6,14}$/.test(full)) {
        setPhoneError("Enter a valid international number (+country code + number, 7–15 digits total).");
        valid = false;
      }
    }

    const trimmedLink = referenceLink.trim();
    if (trimmedLink) {
      try {
        const prelim = trimmedLink.startsWith("http") ? trimmedLink : `https://${trimmedLink}`;
        const url = new URL(prelim);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          setLinkError("Reference link must be HTTP or HTTPS.");
          valid = false;
        }
      } catch {
        setLinkError("Reference link must be a valid URL.");
        valid = false;
      }
    }

    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const trimmedLink = referenceLink.trim();
      const normalizedLink =
        trimmedLink && !trimmedLink.startsWith("http")
          ? `https://${trimmedLink}`
          : trimmedLink || undefined;

      await onSubmit({
        countryCode: countryCode.trim(),
        phone: phone.trim(),
        name: name.trim() || undefined,
        referenceLink: normalizedLink,
      });
      resetState();
      onOpenChange(false);
    } catch (err: any) {
      setFormError(err?.message || "Failed to add guest. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-500" />
            Add New Guest
          </DialogTitle>
          <DialogDescription>
            Add a new guest by entering their international phone number and optional details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Phone Number</Label>
            <div className="flex gap-2">
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  +
                </span>
                <Input
                  placeholder="91"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  disabled={submitting}
                  className="pl-5"
                />
              </div>
              <Input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                disabled={submitting}
              />
            </div>
            {countryError && <p className="text-xs text-red-500 mt-1">{countryError}</p>}
            {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="guest-name">Guest Name (optional)</Label>
            <Input
              id="guest-name"
              placeholder="Guest name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="guest-ref">Reference Link (property URL)</Label>
            <Input
              id="guest-ref"
              placeholder="https://example.com/property"
              value={referenceLink}
              onChange={(e) => setReferenceLink(e.target.value)}
              disabled={submitting}
            />
            {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
          </div>

          {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


