"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Building2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NO_OFFICE = "none";

interface officeOption {
  _id: string;
  name: string;
}

interface OfficeDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  onSaved: () => void;
}

export function OfficeDetailsDialog ({
    open,
    onOpenChange,
    employeeId,
    onSaved,
}: OfficeDetailsDialogProps) {

    const [offices, setOffices] = useState<officeOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [officeAddressId,setOfficeAddressId] = useState<string | null>(null);
    const [assignedEmail,setAssignedEmail] = useState("");
    const [assignedNumber,setAssignedNumber] = useState("");

    const loadData = useCallback(async()=>{
        setLoading(true);
        try {
           const [officesRes,currentRes] = await Promise.all([
            axios.get("/api/office-addresses?active=1"),
            axios.get("/api/employee/office-details",{params:{employeeId}}),
           ]);
           setOffices(officesRes.data?.data ?? []);
           const current = currentRes.data?.officeDetails;
           const currentOfficeId = current?.officeAddressId;

           setOfficeAddressId(currentOfficeId && typeof currentOfficeId === "object" ? currentOfficeId._id : currentOfficeId);

           setAssignedEmail(current?.assignedEmail ?? "");
           setAssignedNumber(current?.assignedNumber ?? "");
         
        } catch (error) {
            toast.error("Failed to load office details");
        } finally {
            setLoading(false);
        }
    },[employeeId]);

    useEffect(()=>{
        if(open) {
           void loadData();
        }else{
            setOfficeAddressId("");
            setAssignedEmail("");
            setAssignedNumber("");
        }
    },[open,loadData])

    const handleSave = async()=>{
        try {
            setSaving(true);
            await axios.put("/api/employee/office-details" , {
                employeeId,
                officeAddressId:officeAddressId || null,
                assignedEmail:assignedEmail.trim() || null,
                assignedNumber:assignedNumber.trim() || null,
            });
            toast.success("Office Details Updated ");
        } catch (error:unknown) {
            const message = (error as {response?:{data?:{error?:string}}})?.response?.data?.error || "Fialed to save the office details";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b bg-muted/40 px-6 py-5">
          <DialogHeader className="space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1 text-left">
                <DialogTitle>Office details</DialogTitle>
                <DialogDescription>
                  Location and company contact used on this person&apos;s email
                  signature. Leave a field empty to clear it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-14 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading office details…
          </div>
        ) : (
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="office-location" className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
              </Label>
              <Select
                value={officeAddressId || NO_OFFICE}
                onValueChange={(value) =>
                  setOfficeAddressId(value === NO_OFFICE ? null : value)
                }
              >
                <SelectTrigger id="office-location">
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_OFFICE}>No office assigned</SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office._id} value={office._id}>
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedEmail" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Assigned email
              </Label>
              <Input
                id="assignedEmail"
                type="email"
                autoComplete="off"
                value={assignedEmail}
                onChange={(e) => setAssignedEmail(e.target.value)}
                placeholder="name@company.com"
              />
              <p className="text-xs text-muted-foreground">
                Shown as the reply-to address on emails they send.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedNumber" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Assigned number
              </Label>
              <Input
                id="assignedNumber"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={assignedNumber}
                onChange={(e) => setAssignedNumber(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        )}

        <DialogFooter className="border-t bg-muted/20 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save details"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
