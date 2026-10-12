"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canAssignWhatsAppParticipantLocation } from "@/lib/whatsapp/participantLocationPrivileges";
import type { Conversation } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation | null;
  userRole?: string;
  userEmail?: string;
  userAreas?: string | string[];
  onSaved?: (conversationId: string, location: string) => void;
};

export function SetParticipantLocationDialog({
  open,
  onOpenChange,
  conversation,
  userRole = "",
  userEmail = "",
  userAreas,
  onSaved,
}: Props) {
  const [locationInput, setLocationInput] = useState("");
  const [assignableLocations, setAssignableLocations] = useState<
    Array<{ displayName: string; locationKey: string }>
  >([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [saving, setSaving] = useState(false);

  const participantLocation = conversation?.participantLocation || "";
  const canAssign = canAssignWhatsAppParticipantLocation({
    role: userRole,
    email: userEmail,
    allotedArea: userAreas,
  });

  useEffect(() => {
    if (!open || !conversation) return;
    setLocationInput(participantLocation);
  }, [open, conversation, participantLocation]);

  useEffect(() => {
    if (!open || !canAssign) return;
    let cancelled = false;
    setLoadingLocations(true);
    axios
      .get("/api/whatsapp/configured-locations")
      .then((res) => {
        if (!cancelled) {
          setAssignableLocations(res.data.locations || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not load cities");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLocations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, canAssign]);

  const handleSave = async () => {
    const loc = locationInput.trim();
    if (!loc || !conversation?._id) return;
    setSaving(true);
    try {
      await axios.post(`/api/whatsapp/conversations/${conversation._id}/meta`, {
        participantLocation: loc,
      });
      onSaved?.(conversation._id, loc);
      onOpenChange(false);
      toast.success(
        participantLocation ? "Location updated" : "Location assigned"
      );
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to save location";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!conversation) return null;

  const typeLabel =
    conversation.conversationType === "owner"
      ? "owner"
      : conversation.conversationType === "guest"
        ? "guest"
        : "contact";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {participantLocation ? "Change location" : "Set location"}
          </DialogTitle>
          <DialogDescription>
            Choose the city for this {typeLabel} chat. The right team will see
            it in their inbox and get notifications.
          </DialogDescription>
        </DialogHeader>

        {loadingLocations ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assignableLocations.length === 0 ? (
          <p className="text-sm text-amber-600">
            No cities are configured yet. Ask SuperAdmin to add them under Phone
            locations.
          </p>
        ) : (
          <Select
            value={locationInput || participantLocation || ""}
            onValueChange={setLocationInput}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select city…" />
            </SelectTrigger>
            <SelectContent>
              {assignableLocations.map((loc) => (
                <SelectItem key={loc.locationKey} value={loc.displayName}>
                  {loc.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={!locationInput.trim() || saving || assignableLocations.length === 0}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
