"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WhatsAppPhoneMaskRules } from "@/lib/whatsapp/phoneMask";

type EmployeeOption = {
  _id: string;
  name: string;
  email: string;
  role: string;
};

interface WhatsAppPhoneMaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppPhoneMaskForm({ open, onOpenChange }: WhatsAppPhoneMaskFormProps) {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [maskOwnerPhones, setMaskOwnerPhones] = useState(false);
  const [maskGuestPhones, setMaskGuestPhones] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoadingEmployees(true);
      const res = await axios.get("/api/employee/getAllEmployee");
      const list = (res?.data?.allEmployees || []) as Array<Record<string, unknown>>;
      setEmployees(
        list.map((e) => ({
          _id: String(e._id),
          name: String(e.name ?? ""),
          email: String(e.email ?? ""),
          role: String(e.role ?? ""),
        })),
      );
    } catch {
      toast({
        variant: "destructive",
        title: "Could not load employees",
      });
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);

  const loadSettings = useCallback(
    async (employeeId: string) => {
      if (!employeeId) return;
      try {
        setLoadingSettings(true);
        const res = await axios.get("/api/employee/whatsapp-phone-mask", {
          params: { employeeId },
        });
        const rules = (res?.data?.whatsappPhoneMask || {}) as Partial<WhatsAppPhoneMaskRules>;
        setMaskOwnerPhones(Boolean(rules.maskOwnerPhones));
        setMaskGuestPhones(Boolean(rules.maskGuestPhones));
      } catch {
        toast({
          variant: "destructive",
          title: "Could not load phone mask settings",
        });
      } finally {
        setLoadingSettings(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (open) {
      void fetchEmployees();
    } else {
      setSelectedEmployeeId("");
      setEmployeeQuery("");
      setMaskOwnerPhones(false);
      setMaskGuestPhones(false);
    }
  }, [open, fetchEmployees]);

  useEffect(() => {
    if (open && selectedEmployeeId) {
      void loadSettings(selectedEmployeeId);
    }
  }, [open, selectedEmployeeId, loadSettings]);

  const filteredEmployees = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q),
    );
  }, [employees, employeeQuery]);

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      toast({ variant: "destructive", title: "Select an employee first" });
      return;
    }
    try {
      setSaving(true);
      await axios.put("/api/employee/whatsapp-phone-mask", {
        employeeId: selectedEmployeeId,
        maskOwnerPhones,
        maskGuestPhones,
      });
      toast({
        title: "Phone visibility updated",
        description:
          "Masked numbers show as ****1234 in WhatsApp. The employee should refresh or sign in again for API responses to apply.",
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to save settings";
      toast({ variant: "destructive", title: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#008069]" />
            WhatsApp phone visibility
          </DialogTitle>
          <DialogDescription>
            Choose which conversation types hide full phone numbers in WhatsApp for this employee.
            Masked numbers show only the last 4 digits (e.g. ******4520) in the chat list and header.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="employee-search">Employee</Label>
            <Input
              id="employee-search"
              placeholder="Search by name or email"
              value={employeeQuery}
              onChange={(e) => setEmployeeQuery(e.target.value)}
              disabled={loadingEmployees}
            />
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              disabled={loadingEmployees}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingEmployees ? "Loading…" : "Select employee"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {filteredEmployees.map((e) => (
                  <SelectItem key={e._id} value={e._id}>
                    {e.name} ({e.role}) — {e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingSettings ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-[#25d366]" />
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-[#e9edef] dark:border-[#2a3942] p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="mask-owner"
                  checked={maskOwnerPhones}
                  onCheckedChange={(v) => setMaskOwnerPhones(v === true)}
                  disabled={!selectedEmployeeId}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="mask-owner" className="cursor-pointer font-medium">
                    Mask owner phone numbers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Owner chats show a partial number only in WhatsApp.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="mask-guest"
                  checked={maskGuestPhones}
                  onCheckedChange={(v) => setMaskGuestPhones(v === true)}
                  disabled={!selectedEmployeeId}
                />
                <div className="space-y-0.5">
                  <Label htmlFor="mask-guest" className="cursor-pointer font-medium">
                    Mask guest phone numbers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Guest chats show a partial number only in WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !selectedEmployeeId || loadingSettings}
            className="bg-[#25d366] hover:bg-[#1da851] text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
