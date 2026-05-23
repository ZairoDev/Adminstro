"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { EMPLOYMENT_TYPE_OPTIONS, type EmploymentType } from "../[id]/constants";

interface EmploymentTypeRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (employmentType: EmploymentType) => Promise<void>;
  loading?: boolean;
  initialValue?: EmploymentType | null;
}

export function EmploymentTypeRequiredDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  initialValue = null,
}: EmploymentTypeRequiredDialogProps) {
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">("");

  useEffect(() => {
    if (open) {
      setEmploymentType(
        initialValue === "fulltime" || initialValue === "intern" ? initialValue : ""
      );
    }
  }, [open, initialValue]);

  const handleContinue = async () => {
    if (employmentType !== "fulltime" && employmentType !== "intern") return;
    await onConfirm(employmentType);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Employment type required
          </DialogTitle>
          <DialogDescription>
            Choose whether this candidate is an Intern or Full Time employee before
            selecting them for training.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="employment-type-select">Employment type</Label>
          <Select
            value={employmentType || undefined}
            onValueChange={(v) => setEmploymentType(v as EmploymentType)}
          >
            <SelectTrigger id="employment-type-select">
              <SelectValue placeholder="Select Intern or Full Time" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={
              loading ||
              (employmentType !== "fulltime" && employmentType !== "intern")
            }
          >
            {loading ? "Saving…" : "Save & continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
