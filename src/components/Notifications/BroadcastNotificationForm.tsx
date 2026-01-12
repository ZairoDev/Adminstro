"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Loader2, Send } from "lucide-react";

interface BroadcastNotificationFormProps {
  onSuccess?: () => void;
}

export function BroadcastNotificationForm({
  onSuccess,
}: BroadcastNotificationFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "critical",
    allUsers: false,
    targetRoles: [] as string[],
    targetLocations: [] as string[],
    expiresAt: "",
  });
  const { toast } = useToast();

  const roles = [
    "SuperAdmin",
    "Admin",
    "Sales",
    "Sales-TeamLead",
    "LeadGen",
    "LeadGen-TeamLead",
    "Content",
    "Developer",
  ];

  const locations = [
    "athens",
    "thessaloniki",
    "crete",
    "all",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and message are required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.allUsers && formData.targetRoles.length === 0 && formData.targetLocations.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one target (All Users, Roles, or Locations)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("/api/notifications/broadcast", {
        title: formData.title.trim(),
        message: formData.message.trim(),
        type: formData.type,
        allUsers: formData.allUsers,
        targetRoles: formData.allUsers ? [] : formData.targetRoles,
        targetLocations: formData.allUsers ? [] : formData.targetLocations,
        expiresAt: formData.expiresAt || undefined,
      });

      if (response.data.success) {
        toast({
          title: "Success",
          description: "Notification broadcasted successfully",
        });
        setOpen(false);
        setFormData({
          title: "",
          message: "",
          type: "info",
          allUsers: false,
          targetRoles: [],
          targetLocations: [],
          expiresAt: "",
        });
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error("Error broadcasting notification:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to broadcast notification",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const toggleLocation = (location: string) => {
    setFormData((prev) => ({
      ...prev,
      targetLocations: prev.targetLocations.includes(location)
        ? prev.targetLocations.filter((l) => l !== location)
        : [...prev.targetLocations, location],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4 mr-2" />
          Broadcast Notice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Broadcast System Notification</DialogTitle>
          <DialogDescription>
            Send a notification to all users or specific teams/locations
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Notification title"
              maxLength={200}
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="Notification message"
              rows={4}
              maxLength={2000}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "info" | "warning" | "critical") =>
                setFormData((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info (Blue)</SelectItem>
                <SelectItem value="warning">Warning (Yellow)</SelectItem>
                <SelectItem value="critical">Critical (Red)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allUsers"
                checked={formData.allUsers}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    allUsers: checked as boolean,
                    targetRoles: [],
                    targetLocations: [],
                  }))
                }
              />
              <Label htmlFor="allUsers" className="font-semibold">
                Send to All Users
              </Label>
            </div>
          </div>

          {!formData.allUsers && (
            <>
              <div>
                <Label>Target Roles</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
                  {roles.map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={formData.targetRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <Label
                        htmlFor={`role-${role}`}
                        className="text-sm cursor-pointer"
                      >
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Target Locations</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 border rounded p-2">
                  {locations.map((location) => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={`location-${location}`}
                        checked={formData.targetLocations.includes(location)}
                        onCheckedChange={() => toggleLocation(location)}
                      />
                      <Label
                        htmlFor={`location-${location}`}
                        className="text-sm cursor-pointer capitalize"
                      >
                        {location}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="expiresAt">Expires At (Optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty for notifications that never expire
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

